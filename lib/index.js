/**
 * Token usage dashboard — host half.
 *
 * Registers GET /token-usage/stats, aggregating provider-reported token usage
 * from every logical session log. Usage samples live on `assistant/message`
 * events (`data.usage` plus `data.message.source.provider/model`), stamped
 * with the event time. Forked sessions skip seed events already covered by a
 * parent present in the corpus, so inherited history is not double-counted.
 *
 * Response shape:
 * {
 *   generatedAt: number,          // epoch ms of this aggregation
 *   sessions: number,             // logical sessions scanned
 *   failed: number,               // sessions whose log failed to load
 *   totals: Bucket,               // corpus-wide totals
 *   byDay: [{ d, ...Bucket }],    // ascending local-date rows
 *   byModel: [{ p, m, ...Bucket }]// provider p + model m, total-descending
 * }
 * Bucket = { in, cr, cw, out, reason, req }: uncached input, cache read,
 * cache write, output (reasoning included), reasoning (informational), and
 * the request count. Total tokens of a row = in + cr + cw + out.
 */

const name = "token-usage";
/** Both services are mounted by the web profile; wait for them if late. */
const inject = ["webServer", "sessionQuery"];

const CACHE_TTL_MS = 60000;
const WORKERS = 8;

const num = (value) => typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
const pad2 = (value) => String(value).padStart(2, "0");
const dayKey = (time) => {
	const date = new Date(time);
	return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};
const newBucket = () => ({ in: 0, cr: 0, cw: 0, out: 0, reason: 0, req: 0 });
const addUsage = (bucket, usage) => {
	bucket.in += num(usage.inputTokens);
	bucket.cr += num(usage.cacheReadTokens);
	bucket.cw += num(usage.cacheWriteTokens);
	bucket.out += num(usage.outputTokens);
	bucket.reason += num(usage.reasoningTokens);
	bucket.req += 1;
};
const bucketOf = (map, key) => {
	const found = map.get(key);
	if (found !== undefined) return found;
	const created = newBucket();
	map.set(key, created);
	return created;
};
const totalOf = (row) => row.in + row.cr + row.cw + row.out;

/**
 * Scan every logical session once and fold usage into the three views.
 * @param sessionQuery - live-preferred session query service.
 * @returns detached JSON-safe aggregation.
 */
async function collect(sessionQuery) {
	const records = await sessionQuery.listSessions();
	const known = new Set(records.map((record) => record.header.id));
	const totals = newBucket();
	const byDay = new Map();
	const byModel = new Map();
	let failed = 0;
	const queue = records.slice();
	async function worker() {
		while (queue.length > 0) {
			const record = queue.shift();
			let snapshot;
			try {
				snapshot = await sessionQuery.readSession(record.header.id);
			} catch {
				failed += 1;
				continue;
			}
			const seedLength = typeof record.header.seedLength === "number" ? record.header.seedLength : 0;
			const parentCovered = seedLength > 0 && record.header.parentSession !== undefined && known.has(record.header.parentSession);
			for (const event of snapshot.events) {
				if (event.type !== "assistant/message") continue;
				if (parentCovered && event.seq < seedLength) continue;
				const usage = event.data && event.data.usage;
				if (usage === undefined || usage === null) continue;
				const source = event.data.message && event.data.message.source || {};
				const model = typeof source.model === "string" && source.model.length > 0 ? source.model : "unknown";
				const provider = typeof source.provider === "string" ? source.provider : "";
				addUsage(totals, usage);
				addUsage(bucketOf(byDay, dayKey(event.time)), usage);
				addUsage(bucketOf(byModel, `${provider}\u0000${model}`), usage);
			}
		}
	}
	await Promise.all(Array.from({ length: Math.min(WORKERS, Math.max(1, queue.length)) }, () => worker()));
	const byDayRows = [];
	for (const [day, bucket] of byDay) byDayRows.push(Object.assign({ d: day }, bucket));
	byDayRows.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
	const byModelRows = [];
	for (const [key, bucket] of byModel) {
		const sep = key.indexOf("\u0000");
		byModelRows.push(Object.assign({ p: key.slice(0, sep), m: key.slice(sep + 1) }, bucket));
	}
	byModelRows.sort((a, b) => totalOf(b) - totalOf(a));
	return {
		generatedAt: Date.now(),
		sessions: records.length,
		failed,
		totals,
		byDay: byDayRows,
		byModel: byModelRows
	};
}

/**
 * Register the stats route; the registration is an effect on this fiber, so
 * unloading removes the endpoint.
 * @param ctx - context carrying webServer and sessionQuery.
 */
function apply(ctx) {
	let cached = null;
	let cachedAt = 0;
	let pending = null;
	const stats = (force) => {
		if (!force && cached !== null && Date.now() - cachedAt < CACHE_TTL_MS) return Promise.resolve(cached);
		if (pending === null) {
			pending = collect(ctx.sessionQuery).then((result) => {
				cached = result;
				cachedAt = Date.now();
				pending = null;
				return result;
			}, (error) => {
				pending = null;
				throw error;
			});
		}
		return pending;
	};
	const handler = async (req, res) => {
		if (req.method !== "GET" && req.method !== "HEAD") {
			res.writeHead(405, { "content-type": "application/json; charset=utf-8" });
			res.end(JSON.stringify({ error: "method not allowed" }));
			return;
		}
		try {
			const url = new URL(req.url ?? "/", "http://localhost");
			const result = await stats(url.searchParams.get("refresh") === "1");
			res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
			res.end(JSON.stringify(result));
		} catch (error) {
			res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
			res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
		}
	};
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/token-usage/stats",
		handler
	}), "token-usage stats route");
}

export { apply, inject, name };
