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
.tu-tabs{display:inline-flex;gap:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:3px;align-self:flex-start;flex-wrap:wrap}
.tu-tab{cursor:pointer;border:none;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:9px;padding:5px 12px;font:var(--dsw-font-xs-13)}
.tu-tab:hover{background:var(--dsw-alias-interactive-bg-hover)}
.tu-tabActive{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.tu-tabActive:hover{background:var(--dsw-alias-bg-layer-2)}
.tu-rangeRow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.tu-dateIn{border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);border-radius:9px;padding:4px 8px;font:var(--dsw-font-xxs-12)}
.tu-card{border:1px solid var(--dsw-alias-border-l2);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.tu-cardTitle{font-size:14px;font-weight:500;line-height:22px}
.tu-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.tu-cell{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;min-width:0}
.tu-cellValue{font-size:16px;font-weight:600;line-height:24px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tu-cellValueSmall{font-size:13px;font-weight:600;line-height:20px;padding:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tu-cellLabel{color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12);display:flex;align-items:center;gap:5px}
.tu-heatScroll{overflow-x:auto;padding-bottom:2px}
.tu-heat{display:flex;gap:3px}
.tu-heatDays{display:grid;grid-template-rows:repeat(7,11px);gap:3px;margin-right:6px;flex:none}
.tu-heatDayLabel{font-size:10px;line-height:11px;color:var(--dsw-alias-label-caption)}
.tu-heatCols{display:flex;gap:3px}
.tu-heatCol{display:grid;grid-template-rows:repeat(7,11px);gap:3px}
.tu-heatCell{width:11px;height:11px;border-radius:3px;background:var(--dsw-alias-border-l1)}
.tu-heatL1{background:var(--dsw-static-deepseek-100)}
.tu-heatL2{background:var(--dsw-static-deepseek-300)}
.tu-heatL3{background:var(--dsw-static-deepseek-450)}
.tu-heatL4{background:var(--dsw-static-deepseek-600)}
.tu-heatL5{background:var(--dsw-static-deepseek-800)}
.tu-heatMonths{display:flex;gap:3px;margin-bottom:4px}
.tu-heatMonth{width:11px;flex:none;font-size:10px;line-height:12px;color:var(--dsw-alias-label-caption);white-space:nowrap}
.tu-heatLegend{display:flex;align-items:center;gap:4px;color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12)}
.tu-heatLegend .tu-heatCell{cursor:default}
.tu-heatHead{display:flex;align-items:center;justify-content:space-between;gap:8px}
.tu-trend{display:flex;gap:8px}
.tu-trendY{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end;width:44px;flex:none;color:var(--dsw-alias-label-caption);font-size:10px;line-height:14px;height:200px}
.tu-trendY2{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;width:34px;flex:none;color:var(--dsw-alias-label-caption);font-size:10px;line-height:14px;height:200px}
.tu-trendMain{flex:1;min-width:0}
.tu-trendPlot{position:relative;height:200px}
.tu-trendGrid{position:absolute;left:0;right:0;border-top:1px solid var(--dsw-alias-border-l1)}
.tu-trendBars{position:absolute;inset:0;display:flex;align-items:flex-end;gap:2px}
.tu-trendCol{flex:1 1 0;min-width:3px;display:flex;flex-direction:column;justify-content:flex-end;height:100%}
.tu-trendStack{display:flex;flex-direction:column;border-radius:3px;overflow:hidden}
.tu-trendSeg{flex-shrink:1;flex-basis:0}
.tu-trendLine{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.tu-trendX{display:flex;gap:2px;margin-top:4px}
.tu-trendXCell{flex:1 1 0;min-width:3px;font-size:10px;line-height:14px;color:var(--dsw-alias-label-caption);white-space:nowrap}
.tu-legend{display:flex;flex-wrap:wrap;gap:12px;color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12)}
.tu-legend span{display:inline-flex;align-items:center;gap:5px}
.tu-dot{width:8px;height:8px;border-radius:2px;display:inline-block;flex:none}
.tu-lineDot{width:12px;height:2px;border-radius:1px;display:inline-block;flex:none;background:var(--dsw-static-deepseek-600)}
.tu-modelRow2{display:flex;gap:20px;align-items:center;flex-wrap:wrap}
.tu-donutWrap{position:relative;width:180px;height:180px;flex:none}
.tu-donutCenter{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;pointer-events:none}
.tu-donutTotal{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums}
.tu-donutLabel{color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12)}
.tu-modelList{flex:1;min-width:240px;display:flex;flex-direction:column}
.tu-modelItem{display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.tu-modelItem:last-child{border-bottom:none}
.tu-modelName{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tu-modelProv{color:var(--dsw-alias-label-caption);font:var(--dsw-font-xxs-12);flex:none;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tu-modelVal{flex:none;width:88px;text-align:right;font-variant-numeric:tabular-nums;font-weight:500}
.tu-modelPct{flex:none;width:52px;text-align:right;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.tu-state{color:var(--dsw-alias-label-secondary);padding:32px 0;text-align:center}
`;
		const DICT = {
			zh: {
				nav: "用量统计",
				title: "用量统计",
				loading: "正在统计所有会话的模型用量…",
				error: "统计失败",
				retry: "重试",
				refresh: "刷新",
				empty: "所选范围内没有模型用量数据",
				updatedAt: "统计截至",
				sessionsUnit: "个会话",
				failedUnit: "个读取失败",
				range7: "最近 7 天",
				range14: "最近 14 天",
				range30: "最近 30 天",
				range90: "最近 90 天",
				rangeCustom: "自定义",
				statTokens: "Tokens 用量",
				statTurns: "完成轮次",
				statReqs: "请求数量",
				statDays: "活跃天数",
				statCache: "平均缓存命中率",
				statTop: "最常用模型",
				heatTitle: "活跃热力图",
				heatLess: "较少",
				heatMore: "较多",
				weekMon: "周一",
				weekWed: "周三",
				weekFri: "周五",
				trendTitle: "按天 Token 趋势",
				legendCache: "缓存命中率",
				legendOther: "其他",
				modelTitle: "模型用量"
			},
			en: {
				nav: "Usage Stats",
				title: "Usage Stats",
				loading: "Aggregating model usage across all sessions…",
				error: "Aggregation failed",
				retry: "Retry",
				refresh: "Refresh",
				empty: "No model usage data in the selected range",
				updatedAt: "updated",
				sessionsUnit: "sessions",
				failedUnit: "failed to load",
				range7: "Last 7 days",
				range14: "Last 14 days",
				range30: "Last 30 days",
				range90: "Last 90 days",
				rangeCustom: "Custom",
				statTokens: "Tokens used",
				statTurns: "Completed turns",
				statReqs: "Requests",
				statDays: "Active days",
				statCache: "Avg cache hit rate",
				statTop: "Top model",
				heatTitle: "Activity heatmap",
				heatLess: "Less",
				heatMore: "More",
				weekMon: "Mon",
				weekWed: "Wed",
				weekFri: "Fri",
				trendTitle: "Daily token trend",
				legendCache: "Cache hit rate",
				legendOther: "Other",
				modelTitle: "Model usage"
			}
		};
		const SERIES_COLORS = [
			"var(--dsw-static-blue-500)",
			"var(--dsw-static-deepseek-500)",
			"var(--dsw-static-amber-500)",
			"var(--dsw-static-green-500)",
			"var(--dsw-static-neutral-bluish-400)",
			"var(--dsw-static-red-400)"
		];
		const OTHER_COLOR = "var(--dsw-static-neutral-300)";
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
			//#region helpers
			const pad2 = (v) => String(v).padStart(2, "0");
			const dateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
			const parseStr = (s) => { const p = s.split("-"); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); };
			const shiftDays = (s, n) => { const d = parseStr(s); d.setDate(d.getDate() + n); return dateStr(d); };
			const seqDays = (from, to) => { const out = []; let cur = from; let guard = 0; while (cur <= to && guard < 400) { out.push(cur); cur = shiftDays(cur, 1); guard += 1; } return out; };
			const fmtInt = (v) => Number(v).toLocaleString("en-US");
			const compact = (v) => {
				if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
				if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
				if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
				return fmtInt(v);
			};
			const amount = (v) => isZh() ? (v / 1e4).toFixed(1) + " 万" : compact(v);
			const totalOf = (row) => row.in + row.cr + row.cw + row.out;
			const cacheRate = (row) => { const denom = row.in + row.cr; return denom > 0 ? row.cr / denom : 0; };
			const monthLabel = (d) => isZh() ? (d.getMonth() + 1) + "月" : d.toLocaleString("en", { month: "short" });
			//#endregion
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
			//#region components
			function StatCards({ days, models }) {
				const t = pick();
				const agg = { in: 0, cr: 0, cw: 0, out: 0, req: 0, turns: 0 };
				for (const row of days) for (const key of Object.keys(agg)) agg[key] += row[key] || 0;
				const activeDays = days.filter((row) => row.req > 0).length;
				let top = null;
				for (const row of models) if (top === null || totalOf(row) > totalOf(top)) top = row;
				const rate = cacheRate(agg);
				const cells = [
					[t.statTokens, fmtInt(totalOf(agg)), false],
					[t.statTurns, fmtInt(agg.turns), false],
					[t.statReqs, fmtInt(agg.req), false],
					[t.statDays, String(activeDays), false],
					[t.statCache, (rate * 100).toFixed(1) + "%", false],
					[t.statTop, top ? (top.p ? top.p + "/" : "") + top.m : "—", true]
				];
				return h("div", { className: "tu-cards" }, cells.map((cell, index) => h("div", { className: "tu-cell", key: index },
					h("div", { className: cell[2] ? "tu-cellValueSmall" : "tu-cellValue", title: String(cell[1]) }, cell[1]),
					h("div", { className: "tu-cellLabel" }, cell[0]))));
			}
			function Heatmap({ byDayMap }) {
				const t = pick();
				const todayStr = dateStr(new Date());
				const start = parseStr(shiftDays(todayStr, -364));
				start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
				const weeks = [];
				const cursor = new Date(start);
				while (dateStr(cursor) <= todayStr) {
					const col = [];
					for (let i = 0; i < 7; i++) {
						const d = dateStr(cursor);
						col.push({ d: d, v: byDayMap.get(d) || 0 });
						cursor.setDate(cursor.getDate() + 1);
					}
					weeks.push(col);
				}
				let max = 1;
				for (const col of weeks) for (const cell of col) max = Math.max(max, cell.v);
				const levelClass = (v) => v <= 0 ? "" : v < max * 0.2 ? " tu-heatL1" : v < max * 0.4 ? " tu-heatL2" : v < max * 0.6 ? " tu-heatL3" : v < max * 0.8 ? " tu-heatL4" : " tu-heatL5";
				const months = weeks.map((col, index) => {
					const first = parseStr(col[0].d);
					if (index === 0 || first.getMonth() !== parseStr(weeks[index - 1][0].d).getMonth()) return monthLabel(first);
					return "";
				});
				const dayLabels = [t.weekMon, "", t.weekWed, "", t.weekFri, "", ""];
				return h("div", { className: "tu-card" },
					h("div", { className: "tu-heatHead" },
						h("div", { className: "tu-cardTitle" }, t.heatTitle),
						h("div", { className: "tu-heatLegend" }, t.heatLess,
							["", " tu-heatL1", " tu-heatL2", " tu-heatL3", " tu-heatL4", " tu-heatL5"].map((c) => h("i", { key: c || "e", className: "tu-heatCell" + c })),
							t.heatMore)),
					h("div", { className: "tu-heatScroll" }, h("div", null,
						h("div", { className: "tu-heatMonths", style: { marginLeft: "40px" } }, months.map((m, i) => h("div", { className: "tu-heatMonth", key: i }, m))),
						h("div", { className: "tu-heat" },
							h("div", { className: "tu-heatDays" }, dayLabels.map((label, i) => h("div", { className: "tu-heatDayLabel", key: i }, label))),
							h("div", { className: "tu-heatCols" }, weeks.map((col, wi) => {
								const cells = col.map((cell) => h("div", {
								className: "tu-heatCell" + levelClass(cell.v),
								key: cell.d,
								title: `${cell.d} · ${fmtInt(cell.v)} tokens`
									}));
								return h("div", { className: "tu-heatCol", key: wi }, cells);
							}))))));
			}
			function TrendChart({ seq, dayModelMap, series, daysMap }) {
				const t = pick();
				const n = seq.length;
				let max = 1;
				for (const d of seq) max = Math.max(max, totalOf(daysMap.get(d) || { in: 0, cr: 0, cw: 0, out: 0 }));
				const points = [];
				let carry = 0;
				for (let i = 0; i < n; i++) {
					const row = daysMap.get(seq[i]);
					if (row && row.req > 0) carry = cacheRate(row);
					points.push([(i + 0.5) / n * 100, 100 - carry * 100]);
				}
				const step = Math.max(1, Math.ceil(n / 8));
				return h("div", null,
					h("div", { className: "tu-trend" },
						h("div", { className: "tu-trendY" }, [1, 0.75, 0.5, 0.25, 0].map((f) => h("div", { key: f }, compact(max * f)))),
						h("div", { className: "tu-trendMain" },
							h("div", { className: "tu-trendPlot" },
								[0, 25, 50, 75, 100].map((p) => h("div", { className: "tu-trendGrid", key: p, style: { top: p + "%" } })),
								h("div", { className: "tu-trendBars" }, seq.map((d) => {
									const row = daysMap.get(d) || { in: 0, cr: 0, cw: 0, out: 0 };
									const total = totalOf(row);
									const per = dayModelMap.get(d) || new Map();
									let other = total;
									const segs = series.map((s) => {
										const v = per.get(s.key) || 0;
										other -= v;
										return h("div", { className: "tu-trendSeg", key: s.key, style: { flexGrow: v, background: s.color } });
									});
									segs.push(h("div", { className: "tu-trendSeg", key: "other", style: { flexGrow: Math.max(0, other), background: OTHER_COLOR } }));
									return h("div", { className: "tu-trendCol", key: d }, h("div", {
										className: "tu-trendStack",
										style: { height: total > 0 ? Math.max(2, Math.round(total / max * 100)) + "%" : "0%" },
										title: `${d} · ${fmtInt(total)} tokens · ${t.legendCache} ${(cacheRate(row) * 100).toFixed(0)}%`
									}, segs));
								})),
								h("svg", { className: "tu-trendLine", viewBox: "0 0 100 100", preserveAspectRatio: "none" },
									h("polyline", {
										fill: "none",
										stroke: "var(--dsw-static-deepseek-600)",
										strokeWidth: 2,
										vectorEffect: "non-scaling-stroke",
										points: points.map((p) => p[0].toFixed(2) + "," + p[1].toFixed(2)).join(" ")
									}))),
							h("div", { className: "tu-trendX" }, seq.map((d, i) => h("div", { className: "tu-trendXCell", key: d }, i % step === 0 ? d.slice(5) : "")))),
						h("div", { className: "tu-trendY2" }, [100, 75, 50, 25, 0].map((p) => h("div", { key: p }, p + "%")))),
					h("div", { className: "tu-legend", style: { marginTop: "10px" } },
						series.map((s) => h("span", { key: s.key }, h("i", { className: "tu-dot", style: { background: s.color } }), s.label)),
						h("span", { key: "other" }, h("i", { className: "tu-dot", style: { background: OTHER_COLOR } }), t.legendOther),
						h("span", { key: "cache" }, h("i", { className: "tu-lineDot" }), t.legendCache)));
			}
			function ModelUsage({ models, grand }) {
				const t = pick();
				const top = models.slice(0, 5);
				const restTotal = models.slice(5).reduce((acc, row) => acc + totalOf(row), 0);
				const donutRows = top.map((row) => totalOf(row));
				if (restTotal > 0) donutRows.push(restTotal);
				const R = 62, C = 2 * Math.PI * R;
				let acc = 0;
				const segs = donutRows.map((v, i) => {
					const frac = grand > 0 ? v / grand : 0;
					const el = h("circle", {
						key: i,
						cx: 90, cy: 90, r: R,
						fill: "none",
						stroke: i < top.length ? SERIES_COLORS[i] : OTHER_COLOR,
						strokeWidth: 26,
						strokeDasharray: `${(frac * C).toFixed(2)} ${C.toFixed(2)}`,
						strokeDashoffset: (-acc * C).toFixed(2),
						transform: "rotate(-90 90 90)"
					});
					acc += frac;
					return el;
				});
				const listRows = top.concat(restTotal > 0 ? [{ p: "", m: t.legendOther, total: restTotal, isOther: true }] : []);
				return h("div", { className: "tu-card" },
					h("div", { className: "tu-cardTitle" }, t.modelTitle),
					h("div", { className: "tu-modelRow2" },
						h("div", { className: "tu-donutWrap" },
							h("svg", { width: 180, height: 180, viewBox: "0 0 180 180" }, segs),
							h("div", { className: "tu-donutCenter" },
								h("div", { className: "tu-donutTotal" }, compact(grand)),
								h("div", { className: "tu-donutLabel" }, t.statTokens))),
						h("div", { className: "tu-modelList" }, listRows.map((row, i) => {
							const v = row.isOther ? row.total : totalOf(row);
							const pct = grand > 0 ? v / grand * 100 : 0;
							return h("div", { className: "tu-modelItem", key: i },
								h("i", { className: "tu-dot", style: { background: i < top.length ? SERIES_COLORS[i] : OTHER_COLOR } }),
								h("div", { className: "tu-modelName", title: row.m }, row.m),
								row.p ? h("div", { className: "tu-modelProv" }, row.p) : null,
								h("div", { className: "tu-modelVal", title: fmtInt(v) }, amount(v)),
								h("div", { className: "tu-modelPct" }, pct.toFixed(1) + "%"));
						}))));
			}
			//#endregion
			function Dashboard() {
				useLocaleTick();
				const t = pick();
				const [range, setRange] = react.useState({ preset: 30, from: shiftDays(dateStr(new Date()), -29), to: dateStr(new Date()) });
				const [state, setState] = react.useState({ status: "loading" });
				const load = react.useCallback((refresh) => {
					setState({ status: "loading" });
					fetch("/token-usage/stats" + (refresh ? "?refresh=1" : "")).then((response) => {
						if (!response.ok) return response.json().catch(() => ({})).then((body) => Promise.reject(new Error(body.error || "HTTP " + response.status)));
						return response.json();
					}).then((data) => setState({ status: "ready", data: data }))
						.catch((error) => setState({ status: "error", message: error && error.message ? String(error.message) : String(error) }));
				}, []);
				react.useEffect(() => { load(false); }, [load]);
				const header = h("div", { className: "tu-head" },
					h("div", { style: { minWidth: 0 } },
						h("div", { className: "tu-title" }, t.title),
						state.status === "ready" ? h("div", { className: "tu-sub" },
							state.data.sessions + " " + t.sessionsUnit + " · " + t.updatedAt + " " + new Date(state.data.generatedAt).toLocaleString() +
							(state.data.failed > 0 ? " · " + state.data.failed + " " + t.failedUnit : "")) : null),
					h("button", { className: "tu-btn", onClick: () => load(true), disabled: state.status === "loading" }, t.refresh));
				if (state.status === "loading") return h("div", { className: "tu-root" }, header, h("div", { className: "tu-state" }, t.loading));
				if (state.status === "error") {
					return h("div", { className: "tu-root" }, header, h("div", { className: "tu-card" },
						h("div", { className: "tu-cardTitle" }, t.error),
						h("div", { className: "tu-sub" }, state.message),
						h("div", null, h("button", { className: "tu-btn", onClick: () => load(true) }, t.retry))));
				}
				const data = state.data;
				const today = dateStr(new Date());
				const from = range.preset === "custom" ? range.from : shiftDays(today, -(range.preset - 1));
				const to = range.preset === "custom" ? range.to : today;
				const effFrom = from <= to ? from : to;
				const effTo = to;
				const days = data.byDay.filter((row) => row.d >= effFrom && row.d <= effTo);
				const daysMap = new Map(days.map((row) => [row.d, row]));
				const dayModelRows = data.byDayModel.filter((row) => row.d >= effFrom && row.d <= effTo);
				const modelAgg = new Map();
				const dayModelMap = new Map();
				for (const row of dayModelRows) {
					const key = row.p + "\u0000" + row.m;
					const agg = modelAgg.get(key) || { p: row.p, m: row.m, in: 0, cr: 0, cw: 0, out: 0, req: 0, turns: 0 };
					agg.in += row.in; agg.cr += row.cr; agg.cw += row.cw; agg.out += row.out; agg.req += row.req;
					modelAgg.set(key, agg);
					let per = dayModelMap.get(row.d);
					if (per === undefined) { per = new Map(); dayModelMap.set(row.d, per); }
					per.set(key, totalOf(row));
				}
				const models = [...modelAgg.values()].sort((a, b) => totalOf(b) - totalOf(a));
				const grand = days.reduce((acc, row) => acc + totalOf(row), 0);
				const series = models.slice(0, 5).map((row, i) => ({ key: row.p + "\u0000" + row.m, label: (row.p ? row.p + "/" : "") + row.m, color: SERIES_COLORS[i] }));
				const seq = seqDays(effFrom, effTo);
				const byDayMapAll = new Map(data.byDay.map((row) => [row.d, totalOf(row)]));
				const presets = [[7, t.range7], [14, t.range14], [30, t.range30], [90, t.range90], ["custom", t.rangeCustom]];
				const rangeRow = h("div", { className: "tu-rangeRow" },
					h("div", { className: "tu-tabs" }, presets.map((entry) => h("button", {
						key: String(entry[0]),
						className: "tu-tab" + (range.preset === entry[0] ? " tu-tabActive" : ""),
						onClick: () => setRange((r) => ({ ...r, preset: entry[0] }))
					}, entry[1]))),
					range.preset === "custom" ? h(react.Fragment, null,
						h("input", { type: "date", className: "tu-dateIn", value: range.from, max: range.to, onChange: (e) => setRange((r) => ({ ...r, from: e.target.value })) }),
						h("span", { className: "tu-sub" }, "–"),
						h("input", { type: "date", className: "tu-dateIn", value: range.to, min: range.from, max: today, onChange: (e) => setRange((r) => ({ ...r, to: e.target.value })) })) : null);
				const hasData = grand > 0;
				return h("div", { className: "tu-root" },
					header,
					rangeRow,
					hasData ? h(react.Fragment, null,
						h(StatCards, { days: days, models: models }),
						h(Heatmap, { byDayMap: byDayMapAll }),
						h("div", { className: "tu-card" },
							h("div", { className: "tu-cardTitle" }, t.trendTitle),
							h(TrendChart, { seq: seq, dayModelMap: dayModelMap, series: series, daysMap: daysMap })),
						h(ModelUsage, { models: models, grand: grand })
					) : h("div", { className: "tu-state" }, t.empty));
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
