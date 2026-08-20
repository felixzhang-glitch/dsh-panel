# DSH 插件开发规范摘录

来源：本仓库 `docs/plugin-guide.md`（以 dsh-token-usage 为实例的完整指南），此处提炼规范要点供快速查阅；全文以 plugin-guide.md 为准

> 摘录日期：2026-08-20；适用 DSH 0.1.0-rc 系列，`dsh web` 部署

## package.json 契约

- `exports["."]` 指向 host 入口，`exports["./client"]` 指向浏览器 bundle（支持字符串或 `{ default }` 形式）
- `exports["./package.json"]` 必须显式导出，否则 `require.resolve` 无法穿透 exports 映射
- `dsh.client.inject`：client 依赖的包名列表，控制实例化顺序，只写实际用到的运行时/槽位包
- `dsh.client.platform` 必须与部署面匹配（web）
- 包声明 `"type": "module"`

## host 半规则

- 顶层导出 `apply / inject / name`，纯 ESM
- `inject` 里的服务经 `ctx.<服务名>` 直接访问；可选服务用 `ctx.get(name)` 并处理 undefined
- 一切副作用必须可逆：`ctx.effect(fn, label)` 返回 disposer，卸载自动调用；不允许持有跨 effect 的未清理资源
- 聚合类服务做成「缓存 + 强制刷新」；输出 JSON-safe 扁平结构，不泄漏 Cordis 活对象

## client 半规则

- 浏览器 bundle 不经打包器，必须手写 `window.__ModuleLoader__.load({ id, factory })` 包装，id 与包名一致
- `require` 只能取已注册模块（react、shell 静态模块、已加载插件）；跨插件取值导入是构建期错误
- React 组件用 `react.createElement`，无 JSX
- 槽位注册走 `ctx.slots.inject(key, () => ctx.slots.register(options, Component))`，不依赖加载顺序
- 样式只用 `--dsw-*` token（alias 语义别名 / static 固定色 / font 字号）
- 静态插件没有 `host.call`，client 取 host 数据走 HTTP 路由

## 挂载与 patch 语义

- 用户侧挂载点是 `~/.dsh/profiles/web/cordis.patch.yml`，顶层数组，每元素一条 patch
- `insert` 不带 id → 追加到组合根列表末尾；带 id → 追加进指定 group
- 不带 `insert` 的是覆盖型 patch，按 id 定位已有行改字段
- 匹配不到的 patch 只警告跳过；但行加载失败导致启动失败（fail loud）
- 绝不改随发行包安装的 shipped preset，用户层只动 patch 文件
- web profile 无 HMR，patch 改动必须重启

## 模块解析双链路

裸包名需在两个解析上下文都能命中，因此需要两条符号链接：

1. client 侧：client-modules 以 profile 目录为 baseUrl 向上查找 → 命中 `~/.dsh/profiles/node_modules/`（链接 A）
2. host 侧：Loader 在运行树内 `await import(name)` → 命中运行树 `node_modules/`（链接 B）

标准布局：真包放 `~/.dsh/profiles/web/<包名>/`，链接 A 相对指向真包，链接 B 绝对指向真包
