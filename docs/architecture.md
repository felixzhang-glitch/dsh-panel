# dsh-panel 架构文档

## 仓库分层

| 层 | 内容 | 说明 |
| --- | --- | --- |
| 平台文档层 | `docs/` | 设计、架构、需求迭代记录与参考资料 |
| 模块代码层 | 仓库根（dsh-token-usage 包，历史原因）+ `modules/<模块名>/`（新模块） | 一个模块一个插件包，含 `lib/`、`package.json` |
| 分发层 | `install.sh` / `uninstall.sh` | 平台统一入口；自有模块走符号链接 + patch 行，第三方（better-sidebar）委托官方 CLI bundle 通道 |

> 自有新模块接入时在本文件追加「模块架构」小节，并在 `design.md` 模块清单登记

## 模块架构：dsh-token-usage

### 数据流

```
~/.dsh/sessions/**/session.jsonl.zstd
        │ sessionQuery.listSessions / readSession
        ▼
collect() 聚合（8 worker 并发，fork seedLength 去重）
        │ 60s TTL 缓存（?refresh=1 强刷）
        ▼
GET /token-usage/stats（webServer.register，JSON-safe 扁平桶）
        │ fetch
        ▼
client.js 三视图渲染（时间范围切片，前端不重复聚合）
```

### host 半（lib/index.js）

- `collect(sessionQuery)`：扫全部会话，只取 `assistant/message` 事件的 `data.usage`，按总量/按天/按模型/按天×模型四个视图折叠成 `Bucket = {in,cr,cw,out,reason,req,turns}`
- fork 去重：`seedLength > 0` 且父会话在语料内时跳过 `seq < seedLength` 的 seed 事件
- turns 用每桶独立的 turn id Set 去重后计数；单会话读取失败只计数不中断
- `apply(ctx)`：闭包内实现缓存（TTL 60s + pending 合并并发请求）与 handler，路由注册包在 `ctx.effect` 内，卸载即注销
- 响应头 `cache-control: no-store`，错误路径也返回 JSON

### client 半（lib/client.js）

- `window.__ModuleLoader__.load` 手写包装（无打包器），`require('react')` 取 shell 静态模块
- `ctx.slots.inject("settings.section", ...)` 注册槽位条目，槽位未声明时自动等待
- 样式经 `ctx.effect` 注入 `<style>`，只用 `--dsw-*` token；locale 经 `ctx.get('locale')` 订阅切换
- 组件状态机：loading/error/ready + 空数据态；图表零依赖（div 堆叠柱、SVG polyline 折线、circle stroke-dasharray 环图、CSS grid 热力图）

### 部署拓扑

```
真包      ~/.dsh/profiles/web/dsh-token-usage/
链接 A    ~/.dsh/profiles/node_modules/dsh-token-usage   # client 解析
链接 B    <运行树>/node_modules/dsh-token-usage           # host 解析
挂载      ~/.dsh/profiles/web/cordis.patch.yml 一行 insert
```

> 已知限制：`dsh` 经 npx 升级会重建缓存目录导致链接 B 失效，重跑 `install.sh` 修复；web profile 无 HMR，patch 改动必须重启

### 依赖契约

- `sessionQuery.listSessions/readSession`、`webServer.register`、`settings.section` 槽位、`--dsw-*` token、ModuleLoader 包装格式
- 验证版本：DSH 0.1.0-rc.6

## 模块架构：dsh-time-awareness

### 定位与数据流

host-only 模块（无 client 半、无 HTTP 路由），让模型感知墙上时钟：每个会话轮次注入一条带来源归属的时间读取消息

```
AgentLoop 提出 step
        │ dispatch waterfall "agent/pre-step"
        ▼
prepend 监听器：先 await next() 委托下游决策
        │ reject / aborted → 原样放行
        │ step !== 1 且非 everyStep → 原样放行
        │ refreshIntervalMs 节流命中（无状态扫 session 事件）→ 原样放行
        ▼
组装三行文本：时间戳（浏览器时区优先）+ 时区策略 + 距上条可见消息耗时
        │ decision.messages 追加一条 sourced UserMessage
        ▼
AgentLoop 在 step/start 后落盘，进入会话历史直至 compaction 遮蔽
```

### host 半（modules/dsh-time-awareness/lib/index.js）

- `inject: ["agents"]`；监听器经 `ctx.on("agent/pre-step", handler, { prepend: true })` 注册，随 fiber 卸载自动移除
- 注入文本三行：`Current time at turn N start: 2026-08-20T17:24:05+08:00[Asia/Shanghai]`、浏览器时区策略（resolved → 按该时区解释未限定时间；mixed/missing → 提示向用户澄清）、`Elapsed since the preceding model-visible message: <duration>`
- 浏览器时区取自本轮 user-rpc 消息源的 `clientTimeZone`（web 客户端每次 prompt 附带），IANA 正则 + `Intl.DateTimeFormat` 双重校验；缺失/混合回退配置 `timeZone`，再回退进程时区
- 消息 source 遵循惯例：`{ kind: "plugin", plugin: "time-awareness", form: "snapshot", sections: [{ name, text }] }`
- 节流无状态：倒序扫 `agent.session.events` 找最近一条本插件注入的 `event.time`，compaction/resume 后不需进程内缓存
- 耗时基线：step 1 取最近 user/message、assistant/message、tool/result（排除本插件自身注入）；everyStep 模式后续 step 取本轮上一条本插件读取
- 失败隔离：注入计算异常只 `ctx.logger.warn` 并原样放行下游决策，绝不挂 turn；配置非法（未知键、坏时区、负间隔）在 apply 期抛出，fail loud
- 零裸包导入：profile 目录解析不到运行树 node_modules，配置手校验替代 schemastery，`Intl`/`crypto.randomUUID` 均为运行时内建

### 配置

patch 行默认无 config 即「每轮一条、进程时区、不节流」，可按需加：

```yaml
- insert:
    - id: time-awareness
      name: 'dsh-time-awareness'
      config:
        timeZone: Asia/Shanghai   # 可选，浏览器时区缺失时的显示回退
        refreshIntervalMs: 60000  # 可选，0/省略 = 不节流
        everyStep: true           # 可选，默认 false = 只注入每轮 step 1
```

### 部署拓扑与已知限制

- 走自有模块标准通道：真包 `~/.dsh/profiles/web/dsh-time-awareness/` + 链接 A/B + patch 行，`./install.sh [all|dsh-time-awareness]` / `./uninstall.sh` 统一管理
- 监听器注册在 agents 注册表根，对所有 agent 生效（含 subagent / workflow worker），token 成本按并发 agent 数放大；默认每轮一条 + 单条三行控制体量
- 注入发生在请求准备期：后续准备失败时读取仍留在历史；每条读取累积至 compaction 遮蔽，append-only 不破坏 KV cache 前缀
- 验证版本：DSH 0.1.0-rc.8

## 第三方接入：dsh-better-sidebar

侧边栏工作台不自建，直接接入第三方插件 dsh-better-sidebar（独立仓库 omdsh-dev/DSH-better-sidebar，npm 包形态）

### 接入通道

```
install.sh install_better_sidebar()
        │ 1. pnpm-workspace.yaml 幂等写 allowBuilds: node-pty（放行原生构建）
        │ 2. dsh plugin --profile web add dsh-better-sidebar@<npm view 解析的最新版本>
        ▼
profile package.json：dependencies + dsh.profile.bundles 登记
        │ profile 启动时 bundle patch 自动挂载（insert id: better-sidebar）
        ▼
右侧栏 + 底部面板：文件树 / CodeMirror 编辑器 / 终端 / Git / 浏览器 / 文件预览
```

### 关键点

- 与自有模块的符号链接 + patch 行通道完全独立：不建链接、不写用户 patch 行；手写挂载行会与 bundle 双挂载（duplicate prefix route 导致启动失败）
- 卸载走 `dsh plugin --profile web remove dsh-better-sidebar`
- 版本耦合：0.14.0 适配 DSH 0.1.0-rc.8，升级 better-sidebar 前先确认 DSH 运行树版本
- 它暴露 `ctx.betterSidebar` 服务（registerTab / registerFileViewer），后续自有模块可扩展侧边栏页面而非自建 UI
