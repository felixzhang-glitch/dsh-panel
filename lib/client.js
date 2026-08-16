window.__ModuleLoader__.load({
	id: "dsh-token-usage",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region styles + copy
		const CSS = `
.tu-root{box-sizing:border-box;display:flex;flex-direction:column;gap:14px;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary);padding:4px 0 12px}
.tu-root *{box-sizing:border-box}
.tu-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.tu-title{font-size:16px;font-weight:500;line-height:24px}
.tu-sub{color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12);margin-top:2px}
.tu-btn{cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);border-radius:10px;padding:4px 12px;font:var(--dsw-font-xxs-12);flex:none}
.tu-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.tu-btn:disabled{opacity:.5;cursor:default;background:transparent}
.tu-tabs{display:flex;gap:4px}
.tu-tab{cursor:pointer;border:none;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:10px;padding:6px 12px;font:var(--dsw-font-xs-13)}
.tu-tab:hover{background:var(--dsw-alias-interactive-bg-hover)}
.tu-tabActive{color:var(--dsw-alias-label-primary);background:var(--dsw-specific-sidebar-nav-item-active)}
.tu-tabActive:hover{background:var(--dsw-specific-sidebar-nav-item-active)}
.tu-card{border:1px solid var(--dsw-alias-border-l2);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.tu-cardTitle{font-size:14px;font-weight:500;line-height:22px}
.tu-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.tu-cell{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;min-width:0}
.tu-cellValue{font-size:16px;font-weight:600;line-height:24px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tu-cellLabel{color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12)}
.tu-legend{display:flex;flex-wrap:wrap;gap:12px;color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12)}
.tu-legend span{display:inline-flex;align-items:center;gap:5px}
.tu-dot{width:8px;height:8px;border-radius:2px;display:inline-block;flex:none}
.tu-in{background:var(--dsw-alias-state-business-primary)}
.tu-cr{background:var(--dsw-static-neutral-bluish-400)}
.tu-cw{background:var(--dsw-static-neutral-bluish-700)}
.tu-out{background:var(--dsw-static-deepseek-500)}
.tu-chartWrap{overflow-x:auto}
.tu-chart{display:flex;align-items:flex-end;gap:2px;height:140px}
.tu-col{flex:1 1 0;min-width:5px;display:flex;flex-direction:column;justify-content:flex-end;height:100%}
.tu-stack{display:flex;flex-direction:column;border-radius:3px;overflow:hidden}
.tu-seg{flex-shrink:1;flex-basis:0}
.tu-axis{display:flex;gap:2px;margin-top:4px}
.tu-axisCell{flex:1 1 0;min-width:5px;text-align:left;color:var(--dsw-alias-label-caption);font-size:10px;line-height:14px;white-space:nowrap}
.tu-tableWrap{overflow-x:auto}
.tu-table{width:100%;border-collapse:collapse;font:var(--dsw-font-xxs-12)}
.tu-table th{color:var(--dsw-alias-label-caption);font-weight:400;text-align:left;padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l2);white-space:nowrap}
.tu-table td{padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);font-variant-numeric:tabular-nums}
.tu-table tr:last-child td{border-bottom:none}
.tu-num{text-align:right}
.tu-modelBars{display:flex;flex-direction:column;gap:10px}
.tu-modelRow{display:flex;align-items:center;gap:10px}
.tu-modelCell{width:190px;flex:none;min-width:0}
.tu-modelId{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tu-provider{color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tu-modelBar{flex:1;height:8px;border-radius:4px;background:var(--dsw-alias-border-l1);overflow:hidden;min-width:40px}
.tu-modelFill{height:100%;border-radius:4px;background:var(--dsw-static-deepseek-500)}
.tu-modelTotal{flex:none;width:64px;text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}
.tu-share{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.tu-miniBar{width:56px;height:6px;border-radius:3px;background:var(--dsw-alias-border-l1);overflow:hidden;display:inline-block}
.tu-miniFill{display:block;height:100%;background:var(--dsw-static-deepseek-500);border-radius:3px}
.tu-state{color:var(--dsw-alias-label-secondary);padding:32px 0;text-align:center}
`;
		const DICT = {
			zh: {
				nav: "Token 用量",
				title: "Token 消耗看板",
				loading: "正在统计所有会话的模型用量…",
				error: "统计失败",
				retry: "重试",
				refresh: "刷新",
				empty: "还没有模型用量数据",
				overview: "总览",
				byDay: "按日期",
				byModel: "按模型",
				statTotal: "总消耗",
				statIn: "输入(未缓存)",
				statCr: "缓存读取",
				statCw: "缓存写入",
				statOut: "输出",
				statReq: "请求次数",
				trend: "近 14 天趋势",
				modelShare: "模型占比",
				dayChart: "每日消耗",
				dayTable: "每日明细",
				modelTable: "模型明细",
				colDate: "日期",
				colModel: "模型",
				colReq: "请求",
				colIn: "输入",
				colCr: "缓存读",
				colCw: "缓存写",
				colOut: "输出",
				colTotal: "合计",
				colShare: "占比",
				legendIn: "输入(未缓存)",
				legendCr: "缓存读取",
				legendCw: "缓存写入",
				legendOut: "输出",
				sessionsUnit: "个会话",
				failedUnit: "个读取失败",
				updatedAt: "统计于",
				dayCap: "仅显示最近 120 天",
				outNote: "输出包含 reasoning tokens；fork 会话的继承历史不重复计数"
			},
			en: {
				nav: "Token Usage",
				title: "Token Usage Dashboard",
				loading: "Aggregating model usage across all sessions…",
				error: "Aggregation failed",
				retry: "Retry",
				refresh: "Refresh",
				empty: "No model usage data yet",
				overview: "Overview",
				byDay: "By Date",
				byModel: "By Model",
				statTotal: "Total",
				statIn: "Input (uncached)",
				statCr: "Cache read",
				statCw: "Cache write",
				statOut: "Output",
				statReq: "Requests",
				trend: "Last 14 days",
				modelShare: "Model share",
				dayChart: "Daily usage",
				dayTable: "Daily breakdown",
				modelTable: "Model breakdown",
				colDate: "Date",
				colModel: "Model",
				colReq: "Reqs",
				colIn: "Input",
				colCr: "Cache R",
				colCw: "Cache W",
				colOut: "Output",
				colTotal: "Total",
				colShare: "Share",
				legendIn: "Input (uncached)",
				legendCr: "Cache read",
				legendCw: "Cache write",
				legendOut: "Output",
				sessionsUnit: "sessions",
				failedUnit: "failed to load",
				updatedAt: "updated",
				dayCap: "showing last 120 days",
				outNote: "Output includes reasoning tokens; inherited fork history is not double-counted"
			}
		};
		//#endregion
		//#region plugin
		const name = "token-usage-ui";
		const inject = ["slots"];
		function apply(ctx) {
			const h = react.createElement;
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.textContent = CSS;
				document.head.appendChild(tag);
				return () => tag.remove();
			}, "token-usage dashboard styles");
			const isZh = () => {
				try {
					const locale = ctx.get("locale");
					if (locale !== undefined && typeof locale.getSnapshot === "function") {
						return String(locale.getSnapshot().active).toLowerCase().indexOf("zh") === 0;
					}
				} catch (error) { /* fall back to zh */ }
				return true;
			};
			const pick = () => isZh() ? DICT.zh : DICT.en;
			const fmtInt = (value) => Number(value).toLocaleString("en-US");
			const compact = (value) => {
				if (value >= 1e9) return (value / 1e9).toFixed(2) + "B";
				if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
				if (value >= 1e4) return (value / 1e3).toFixed(1) + "K";
				return fmtInt(value);
			};
			const totalOf = (row) => row.in + row.cr + row.cw + row.out;
			function useLocaleTick() {
				const [tick, setTick] = react.useState(0);
				react.useEffect(() => {
					let locale;
					try { locale = ctx.get("locale"); } catch (error) { locale = undefined; }
					if (locale === undefined || typeof locale.subscribe !== "function") return undefined;
					return locale.subscribe(() => setTick((value) => value + 1));
				}, []);
				return tick;
			}
			function Legend() {
				const t = pick();
				const entries = [["tu-in", t.legendIn], ["tu-cr", t.legendCr], ["tu-cw", t.legendCw], ["tu-out", t.legendOut]];
				return h("div", { className: "tu-legend" }, entries.map((entry) => h("span", { key: entry[0] }, h("i", { className: "tu-dot " + entry[0] }), entry[1])));
			}
			function DayChart({ rows }) {
				if (rows.length === 0) return null;
				let max = 1;
				for (const row of rows) max = Math.max(max, totalOf(row));
				const step = Math.max(1, Math.ceil(rows.length / 8));
				return h("div", { className: "tu-chartWrap" }, h("div", { style: { minWidth: rows.length * 10 + "px" } },
					h("div", { className: "tu-chart" }, rows.map((row) => {
						const total = totalOf(row);
						return h("div", { className: "tu-col", key: row.d }, h("div", {
							className: "tu-stack",
							style: { height: total > 0 ? Math.max(2, Math.round(total / max * 100)) + "%" : "0%" },
							title: row.d + " · " + fmtInt(total) + " tokens · " + fmtInt(row.req) + " requests"
						},
							h("div", { className: "tu-seg tu-out", style: { flexGrow: row.out } }),
							h("div", { className: "tu-seg tu-cw", style: { flexGrow: row.cw } }),
							h("div", { className: "tu-seg tu-cr", style: { flexGrow: row.cr } }),
							h("div", { className: "tu-seg tu-in", style: { flexGrow: row.in } })));
					})),
					h("div", { className: "tu-axis" }, rows.map((row, index) => h("div", { className: "tu-axisCell", key: row.d }, index % step === 0 ? row.d.slice(5) : "")))));
			}
			function StatGrid({ totals }) {
				const t = pick();
				const cells = [[t.statTotal, totalOf(totals)], [t.statIn, totals.in], [t.statCr, totals.cr], [t.statCw, totals.cw], [t.statOut, totals.out], [t.statReq, totals.req]];
				return h("div", { className: "tu-grid" }, cells.map((cell, index) => h("div", { className: "tu-cell", key: index },
					h("div", { className: "tu-cellValue", title: fmtInt(cell[1]) }, compact(cell[1])),
					h("div", { className: "tu-cellLabel" }, cell[0]))));
			}
			function ModelBars({ rows }) {
				let max = 1;
				for (const row of rows) max = Math.max(max, totalOf(row));
				return h("div", { className: "tu-modelBars" }, rows.map((row) => {
					const total = totalOf(row);
					return h("div", { className: "tu-modelRow", key: row.p + "/" + row.m },
						h("div", { className: "tu-modelCell" },
							h("div", { className: "tu-modelId", title: row.m }, row.m),
							row.p ? h("div", { className: "tu-provider" }, row.p) : null),
						h("div", { className: "tu-modelBar", title: fmtInt(total) + " tokens" },
							h("div", { className: "tu-modelFill", style: { width: total / max * 100 + "%" } })),
						h("div", { className: "tu-modelTotal" }, compact(total)));
				}));
			}
			function DataTable({ cols, rows }) {
				return h("div", { className: "tu-tableWrap" }, h("table", { className: "tu-table" },
					h("thead", null, h("tr", null, cols.map((col) => h("th", { key: col.k, className: col.num ? "tu-num" : "" }, col.label)))),
					h("tbody", null, rows.map((row, rowIndex) => h("tr", { key: rowIndex }, cols.map((col) => h("td", { key: col.k, className: col.num ? "tu-num" : "" }, col.render ? col.render(row) : row[col.k])))))));
			}
			function Dashboard() {
				useLocaleTick();
				const t = pick();
				const [tab, setTab] = react.useState("overview");
				const [state, setState] = react.useState({ status: "loading" });
				const load = react.useCallback((refresh) => {
					setState({ status: "loading" });
					fetch("/token-usage/stats" + (refresh ? "?refresh=1" : "")).then((response) => {
						if (!response.ok) return response.json().catch(() => ({})).then((body) => Promise.reject(new Error(body.error || "HTTP " + response.status)));
						return response.json();
					}).then((data) => {
						setState({ status: "ready", data: data });
					}, (error) => {
						setState({ status: "error", message: error && error.message ? String(error.message) : String(error) });
					});
				}, []);
				react.useEffect(() => { load(false); }, [load]);
				const header = h("div", { className: "tu-head" },
					h("div", { style: { minWidth: 0 } },
						h("div", { className: "tu-title" }, t.title),
						state.status === "ready" ? h("div", { className: "tu-sub" },
							state.data.sessions + " " + t.sessionsUnit + " · " + t.updatedAt + " " + new Date(state.data.generatedAt).toLocaleString() +
							(state.data.failed > 0 ? " · " + state.data.failed + " " + t.failedUnit : "")) : null),
					h("button", { className: "tu-btn", onClick: () => load(true), disabled: state.status === "loading" }, t.refresh));
				if (state.status === "loading") {
					return h("div", { className: "tu-root" }, header, h("div", { className: "tu-state" }, t.loading));
				}
				if (state.status === "error") {
					return h("div", { className: "tu-root" }, header, h("div", { className: "tu-card" },
						h("div", { className: "tu-cardTitle" }, t.error),
						h("div", { className: "tu-sub" }, state.message),
						h("div", null, h("button", { className: "tu-btn", onClick: () => load(true) }, t.retry))));
				}
				const data = state.data;
				if (data.totals.req === 0) {
					return h("div", { className: "tu-root" }, header, h("div", { className: "tu-state" }, t.empty));
				}
				let content = null;
				if (tab === "overview") {
					content = [
						h(StatGrid, { key: "grid", totals: data.totals }),
						h("div", { key: "trend", className: "tu-card" },
							h("div", { className: "tu-cardTitle" }, t.trend),
							h(Legend, null),
							h(DayChart, { rows: data.byDay.slice(-14) })),
						h("div", { key: "share", className: "tu-card" },
							h("div", { className: "tu-cardTitle" }, t.modelShare),
							h(ModelBars, { rows: data.byModel.slice(0, 8) }))
					];
				} else if (tab === "day") {
					const capped = data.byDay.slice(-120);
					const cols = [
						{ k: "d", label: t.colDate },
						{ k: "req", label: t.colReq, num: true, render: (row) => fmtInt(row.req) },
						{ k: "in", label: t.colIn, num: true, render: (row) => fmtInt(row.in) },
						{ k: "cr", label: t.colCr, num: true, render: (row) => fmtInt(row.cr) },
						{ k: "cw", label: t.colCw, num: true, render: (row) => fmtInt(row.cw) },
						{ k: "out", label: t.colOut, num: true, render: (row) => fmtInt(row.out) },
						{ k: "total", label: t.colTotal, num: true, render: (row) => fmtInt(totalOf(row)) }
					];
					content = [
						h("div", { key: "chart", className: "tu-card" },
							h("div", { className: "tu-cardTitle" }, t.dayChart + (data.byDay.length > capped.length ? " · " + t.dayCap : "")),
							h(Legend, null),
							h(DayChart, { rows: capped })),
						h("div", { key: "table", className: "tu-card" },
							h("div", { className: "tu-cardTitle" }, t.dayTable),
							h(DataTable, { cols: cols, rows: capped.slice().reverse() }))
					];
				} else {
					const grand = totalOf(data.totals);
					const cols = [
						{
							k: "m", label: t.colModel,
							render: (row) => h("div", { className: "tu-modelCell", style: { width: "auto" } },
								h("div", { className: "tu-modelId", title: row.m }, row.m),
								row.p ? h("div", { className: "tu-provider" }, row.p) : null)
						},
						{ k: "req", label: t.colReq, num: true, render: (row) => fmtInt(row.req) },
						{ k: "in", label: t.colIn, num: true, render: (row) => fmtInt(row.in) },
						{ k: "cr", label: t.colCr, num: true, render: (row) => fmtInt(row.cr) },
						{ k: "cw", label: t.colCw, num: true, render: (row) => fmtInt(row.cw) },
						{ k: "out", label: t.colOut, num: true, render: (row) => fmtInt(row.out) },
						{ k: "total", label: t.colTotal, num: true, render: (row) => fmtInt(totalOf(row)) },
						{
							k: "share", label: t.colShare, num: true,
							render: (row) => {
								const pct = grand > 0 ? totalOf(row) / grand * 100 : 0;
								return h("span", { className: "tu-share" },
									h("span", { className: "tu-miniBar" }, h("span", { className: "tu-miniFill", style: { width: pct + "%" } })),
									pct.toFixed(1) + "%");
							}
						}
					];
					content = [
						h("div", { key: "table", className: "tu-card" },
							h("div", { className: "tu-cardTitle" }, t.modelTable),
							h("div", { className: "tu-sub" }, t.outNote),
							h(DataTable, { cols: cols, rows: data.byModel }))
					];
				}
				const tabs = [["overview", t.overview], ["day", t.byDay], ["model", t.byModel]];
				return h("div", { className: "tu-root" },
					header,
					h("div", { className: "tu-tabs" }, tabs.map((entry) => h("button", {
						key: entry[0],
						className: "tu-tab" + (tab === entry[0] ? " tu-tabActive" : ""),
						onClick: () => setTab(entry[0])
					}, entry[1]))),
					content);
			}
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "token-usage",
				order: 90,
				label: () => pick().nav
			}, () => h(Dashboard)));
		}
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
		//#endregion
	}
});
