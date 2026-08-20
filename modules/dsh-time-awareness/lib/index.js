/**
 * Time awareness — host half.
 *
 * Gives the model a wall-clock sense: one prepended `agent/pre-step` listener
 * appends a single sourced time-reading user message to the entering batch.
 * Default cadence is exactly one reading per conversation turn (the turn's
 * first step); `everyStep: true` switches to one per eligible step like the
 * official time-context plugin.
 *
 * Injected text (three lines, `<timestamp>` is ISO-shaped with numeric offset
 * and IANA zone, durations are compact whole-second units):
 *
 *   Current time at turn <turn> start: <timestamp>
 *   Browser time zone for this request: <zone-policy>
 *   Elapsed since the preceding model-visible message: <duration|unavailable>
 *
 * Design constraints honored here:
 * - Zero bare imports. This package loads from the profile dir, where the DSH
 *   runtime tree's node_modules is not resolvable; even `schemastery` would
 *   fail to resolve. Config is therefore validated by hand, failing loud at
 *   plugin load like a schema would.
 * - Stateless scheduling. Interval suppression scans the raw durable session
 *   events for the latest plugin-attributed injection, so it survives
 *   compaction and resume without any process-local cache.
 * - Failure containment. A malformed reading never fails the turn: the
 *   downstream decision passes through unchanged and the error is logged.
 * - Reversibility. `ctx.on` registers as a fiber effect, so unloading the
 *   plugin removes the listener automatically.
 */

const name = "time-awareness";
/** The agents registry owns pre-step dispatch; wait for it when mounted late. */
const inject = ["agents"];

const KNOWN_CONFIG_KEYS = new Set(["timeZone", "refreshIntervalMs", "everyStep"]);
const IANA_TIME_ZONE = /^[A-Za-z][A-Za-z0-9_+.-]*(?:\/[A-Za-z0-9_+.-]+)+$/;

/**
 * Validate the raw plugin config and fill defaults.
 * @param raw - config object from cordis.patch.yml (may be undefined).
 * @returns normalized `{ timeZone?, refreshIntervalMs, everyStep }`.
 * @throws TypeError on any invalid value; a bad config must fail plugin load.
 */
function resolveConfig(raw) {
	const config = raw ?? {};
	if (typeof config !== "object" || config === null || Array.isArray(config)) {
		throw new TypeError("time-awareness: config must be a mapping");
	}
	for (const key of Object.keys(config)) {
		if (!KNOWN_CONFIG_KEYS.has(key)) {
			throw new TypeError(`time-awareness: unknown config key ${JSON.stringify(key)} (expected one of: timeZone, refreshIntervalMs, everyStep)`);
		}
	}
	const { timeZone, refreshIntervalMs, everyStep } = config;
	if (timeZone !== undefined && (typeof timeZone !== "string" || timeZone.length === 0)) {
		throw new TypeError("time-awareness: timeZone must be a non-empty IANA Area/Location string");
	}
	if (refreshIntervalMs !== undefined && (!Number.isSafeInteger(refreshIntervalMs) || refreshIntervalMs < 0)) {
		throw new TypeError(`time-awareness: refreshIntervalMs must be a non-negative safe integer, got ${String(refreshIntervalMs)}`);
	}
	if (everyStep !== undefined && typeof everyStep !== "boolean") {
		throw new TypeError("time-awareness: everyStep must be a boolean");
	}
	return {
		timeZone,
		refreshIntervalMs: refreshIntervalMs ?? 0,
		everyStep: everyStep ?? false
	};
}

/**
 * Create the formatter used for durable timestamp readings.
 * @param timeZone - explicit display zone, or undefined for the process zone.
 * @returns Intl formatter with stable numeric fields and long numeric offset.
 */
function createTimestampFormatter(timeZone) {
	return new Intl.DateTimeFormat("en-US", {
		...(timeZone === undefined ? {} : { timeZone }),
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
		timeZoneName: "longOffset"
	});
}

/**
 * Format epoch milliseconds as an ISO-shaped timestamp with offset and zone.
 * @returns text like `2026-08-20T17:24:05+08:00[Asia/Shanghai]`.
 */
function formatTimestamp(now, formatter, timeZone) {
	const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
	const offset = parts.timeZoneName.replace(/^GMT$/, "GMT+00:00").slice(3);
	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}[${timeZone}]`;
}

/**
 * Format a non-negative elapsed millisecond count as whole-second units.
 * @returns text like `1d 2h 3m 4s` (leading zero units omitted).
 */
function formatDuration(elapsedMs) {
	let seconds = Math.floor(Math.max(0, elapsedMs) / 1000);
	const days = Math.floor(seconds / 86400);
	seconds %= 86400;
	const hours = Math.floor(seconds / 3600);
	seconds %= 3600;
	const minutes = Math.floor(seconds / 60);
	seconds %= 60;
	const parts = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	parts.push(`${seconds}s`);
	return parts.join(" ");
}

/**
 * Read and validate the browser zone attached to one user-rpc message source.
 * @returns canonical IANA zone, or undefined when the message carries none.
 * @throws TypeError on a present-but-invalid zone (Host canonicalizes these
 * upstream, so a bad value indicates a protocol violation worth surfacing).
 */
function browserTimeZoneOf(message) {
	const source = message?.source;
	if (!source || source.kind !== "user") return undefined;
	const value = typeof source.rpcId === "string" && typeof source.clientTimeZone === "string"
		? source.clientTimeZone
		: undefined;
	if (value === undefined) return undefined;
	if (value !== "UTC" && !IANA_TIME_ZONE.test(value)) {
		throw new TypeError(`time-awareness: browser time zone must be canonical UTC or IANA Area/Location: ${JSON.stringify(value)}`);
	}
	let canonical;
	try {
		canonical = new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
	} catch (error) {
		throw new TypeError(`time-awareness: browser time zone is unsupported: ${JSON.stringify(value)}`, { cause: error });
	}
	if (canonical !== value) {
		throw new TypeError(`time-awareness: browser time zone must be canonical: ${JSON.stringify(value)}`);
	}
	return value;
}

/**
 * Derive the browser zone context for one open turn.
 * @param messages - entered and proposed user messages belonging to the turn.
 * @returns `{kind:"resolved",timeZone}` | `{kind:"mixed",timeZones}` | `{kind:"missing"}`.
 */
function deriveBrowserZone(messages) {
	const zones = [...new Set(messages.flatMap((message) => {
		const zone = browserTimeZoneOf(message);
		return zone === undefined ? [] : [zone];
	}))].sort();
	if (zones.length === 0) return { kind: "missing" };
	if (zones.length === 1) return { kind: "resolved", timeZone: zones[0] };
	return { kind: "mixed", timeZones: zones };
}

/** Render the model-facing zone policy line for one browser zone context. */
function renderBrowserZonePolicy(context) {
	switch (context.kind) {
		case "resolved":
			return `Browser time zone for this request: ${context.timeZone}. Interpret otherwise-unqualified dates and times in this zone.`;
		case "mixed":
			return `Browser time zone for this request: mixed ${JSON.stringify(context.timeZones)}. Ask the user to clarify otherwise-unqualified dates and times.`;
		default:
			return "Browser time zone for this request: unavailable. Ask the user to clarify otherwise-unqualified dates and times.";
	}
}

/** Whether one durable user message is an injection of this plugin. */
function isOwnInjection(message) {
	return message?.source?.kind === "plugin" && message.source.plugin === name;
}

/** Find the latest model-visible event time, ignoring this plugin's readings. */
function precedingMessageTime(agent) {
	const events = agent.session.events;
	for (let index = events.length - 1; index >= 0; index -= 1) {
		const event = events[index];
		switch (event?.type) {
			case "user/message":
				if (isOwnInjection(event.data)) break;
				return event.time;
			case "assistant/message":
			case "tool/result":
				return event.time;
			default:
				break;
		}
	}
	return undefined;
}

/** Find this plugin's latest reading inside the open turn (everyStep mode). */
function precedingStepContextTime(agent, turn) {
	const events = agent.session.events;
	for (let index = events.length - 1; index >= 0; index -= 1) {
		const event = events[index];
		if (event?.type === "turn/start" && event.data.turn === turn) return undefined;
		if (event?.type === "user/message" && isOwnInjection(event.data)) return event.time;
	}
	return undefined;
}

/** Find this plugin's latest durable injection anywhere in the session. */
function latestInjectionTime(agent) {
	const events = agent.session.events;
	for (let index = events.length - 1; index >= 0; index -= 1) {
		const event = events[index];
		if (event?.type === "user/message" && isOwnInjection(event.data)) return event.time;
	}
	return undefined;
}

/** Collect entered and proposed user messages belonging to the open turn. */
function requestMessagesOfTurn(agent, turn, proposed) {
	const events = agent.session.events;
	let start = -1;
	for (let index = events.length - 1; index >= 0; index -= 1) {
		const event = events[index];
		if (event?.type === "turn/start" && event.data.turn === turn) {
			start = index;
			break;
		}
	}
	const entered = [];
	for (let index = start + 1; index < events.length; index += 1) {
		const event = events[index];
		if (event?.type === "user/message") entered.push(event.data);
	}
	return [...entered, ...proposed];
}

/** Build the immutable-shaped user message carrying one time reading. */
function createTimeMessage(text) {
	const message = {
		id: crypto.randomUUID(),
		role: "user",
		content: [{ type: "text", text }],
		source: {
			kind: "plugin",
			plugin: name,
			form: "snapshot",
			sections: [{ name, text }]
		}
	};
	return Object.freeze(message);
}

/** Compose the three-line reading for one injection. */
function renderText(now, turn, step, previous, formatter, timeZone, browser) {
	const elapsed = previous === undefined ? "unavailable" : formatDuration(now - previous);
	const phase = step === 1 ? `Current time at turn ${turn} start` : `Time sampled at turn ${turn}, step ${step}`;
	const baseline = step === 1 ? "model-visible message" : "time-awareness context";
	return `${phase}: ${formatTimestamp(now, formatter, timeZone)}\n${renderBrowserZonePolicy(browser)}\nElapsed since the preceding ${baseline}: ${elapsed}.`;
}

/**
 * Register the prepended pre-step listener for the lifetime of `ctx`.
 * @param ctx - plugin context; must expose the `agents` registry.
 * @param raw - config: optional `timeZone` (IANA), optional non-negative
 * `refreshIntervalMs` (0 = no interval suppression), optional `everyStep`
 * (default false = one reading on each turn's first step).
 * @throws when the config or the configured/process time zone is invalid.
 */
function apply(ctx, raw) {
	const config = resolveConfig(raw);
	let fallbackFormatter;
	try {
		fallbackFormatter = createTimestampFormatter(config.timeZone);
	} catch (cause) {
		const message = config.timeZone === undefined
			? "time-awareness: failed to resolve the system time zone"
			: `time-awareness: invalid IANA timeZone ${JSON.stringify(config.timeZone)}`;
		throw new Error(message, { cause });
	}
	const fallbackTimeZone = fallbackFormatter.resolvedOptions().timeZone;
	const formatters = new Map([[fallbackTimeZone, fallbackFormatter]]);
	const formatterFor = (timeZone) => {
		let formatter = formatters.get(timeZone);
		if (formatter === undefined) {
			formatter = createTimestampFormatter(timeZone);
			formatters.set(timeZone, formatter);
		}
		return formatter;
	};
	ctx.on("agent/pre-step", async ({ agent, turn, step, signal }, next) => {
		const decision = await next();
		if (decision.kind === "reject" || signal.aborted) return decision;
		if (!config.everyStep && step !== 1) return decision;
		try {
			const now = Date.now();
			if (config.refreshIntervalMs > 0) {
				const last = latestInjectionTime(agent);
				if (last !== undefined && now >= last && now - last < config.refreshIntervalMs) return decision;
			}
			const previous = step === 1 ? precedingMessageTime(agent) : precedingStepContextTime(agent, turn);
			const browser = deriveBrowserZone(requestMessagesOfTurn(agent, turn, decision.messages));
			const timeZone = browser.kind === "resolved" ? browser.timeZone : fallbackTimeZone;
			const text = renderText(now, turn, step, previous, formatterFor(timeZone), timeZone, browser);
			return { kind: "enter", messages: [...decision.messages, createTimeMessage(text)] };
		} catch (error) {
			ctx.logger.warn(`time-awareness: injection skipped for turn ${turn}, step ${step}`, error);
			return decision;
		}
	}, { prepend: true });
}

export { apply, inject, name };
