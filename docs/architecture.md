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
