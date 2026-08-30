# 前端约定

> 适用范围：模块 client 半（浏览器侧）。当前仅 dsh-token-usage 有 client 半（`lib/client.js`），dsh-time-awareness 为 host-only

## 技术栈

- 框架：React，经 shell 静态模块获取（`require('react')`），禁止引第二份 React
- 构建工具：无打包器，手写 `window.__ModuleLoader__.load` 包装（bundle 必须手写该包装）
- 样式方案：`<style>` 经 `ctx.effect` 注入，只用 `--dsw-*` 主题 token，不自造色值；卸载随 disposer 移除

## 目录约定

```
<模块>/
├── lib/
│   ├── index.js    # host 半：Cordis 插件（apply/inject/name），注册 HTTP 路由供数
│   └── client.js   # client 半：ModuleLoader 包装的浏览器 bundle，只做展示
└── package.json    # 双面声明：exports + dsh.client（inject 运行时包，platform: web）
```

## 组件与页面规范

- 写法：无 JSX，只用 `react.createElement`
- 槽位：经 `ctx.slots.inject(...)` 注册（如 `settings.section`），槽位未声明时自动等待；未来如需独立面板优先扩展 better-sidebar 的 `ctx.betterSidebar`（registerTab / registerFileViewer）而非自建容器
- 状态管理：组件内状态机（loading / error / ready + 空数据态）；卸载竞态防护——fetch 挂 `AbortController`，卸载/重复加载时 abort，AbortError 静默
- 请求层：静态插件没有 `host.call`，client 取 host 数据一律 fetch host 注册的 HTTP 路由；前端不重复聚合，只做时间范围切片与渲染
- 文案：中英双语，经 `ctx.get('locale')` 订阅切换，禁止硬编码文案

## 交互与视觉基线

- 设计规范：跟随宿主主题，零图表库——能用 DOM/SVG/CSS 表达的可视化不引依赖（div 堆叠柱、SVG polyline 折线、circle stroke-dasharray 环图、CSS grid 热力图）
- 兼容性：仅 DSH web 部署（浏览器内核以宿主为准）

## 性能要求

- 数据接口服务端缓存（如 token-usage 60s TTL + single-flight），client 不触发重复聚合；`?refresh=1` 类强刷必须有冷却
- `TODO: 待补充`（首屏/包体积等量化指标，自用项目暂不设硬性基线）
