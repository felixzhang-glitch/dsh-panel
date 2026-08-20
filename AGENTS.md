# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## 核心指令

- 本仓库是 DeepSeek Harness (DSH) 插件集合仓库 dsh-panel 的开发迭代仓库；自有模块 dsh-token-usage 在仓库根，侧边栏工作台由第三方 dsh-better-sidebar 接入，后续会持续新增模块
- 每次需求迭代必须追加更新 `docs/requirements.md`（时间倒序）
- 设计/架构变更需同步更新 `docs/design.md` / `docs/architecture.md`
- 新模块接入需同步更新本文件代码地图与 docs 文档中的模块清单

## 代码地图

### 平台层

| 路径 | 职责 |
| --- | --- |
| `docs/` | 设计、架构、需求迭代文档与参考资料 |
| `install.sh` / `uninstall.sh` | 平台统一入口：`./install.sh [all\|模块名]`，默认装全部（根包 + modules/* + dsh-better-sidebar）；自有模块走符号链接 + patch 行，better-sidebar 走官方 bundle 通道 |

### 第三方模块 dsh-better-sidebar（VSCode 式右侧栏工作台）

- 源码不在本仓库（独立仓库 DSH-better-sidebar，npm 包形态接入），本仓库只维护安装编排
- 安装走官方 bundle 通道：`dsh plugin --profile web add dsh-better-sidebar@<版本>`，注册进 `dsh.profile.bundles`，不建符号链接、不写 patch 行（手写挂载行会与 bundle 双挂载导致启动失败）
- 文件树 / 编辑器 / 终端 / Git / 内嵌浏览器 / 文件预览（md / html / pdf / Office / 图片）由它提供，不再自建

### 模块 dsh-token-usage（用量统计，设置 → 用量统计）

| 路径 | 职责 |
| --- | --- |
| `lib/index.js` | host 半：Cordis 插件（`apply/inject/name`），聚合会话日志，注册 `GET /token-usage/stats`（60s 缓存，`?refresh=1` 强刷） |
| `lib/client.js` | client 半：ModuleLoader 包装的浏览器 bundle，注入 `settings.section` 槽位，三视图 UI（零图表库） |
| `package.json` | 双面声明：`exports` + `dsh.client`（inject 运行时包，platform: web） |
| `docs/plugin-guide.md` | 插件开发·维护·部署指南（对外发布文档） |

## 关键约束

- host 一切副作用必须可逆：`ctx.effect(fn, label)` 返回 disposer，卸载自动调用
- client 无 JSX，只用 `react.createElement`；bundle 必须手写 `window.__ModuleLoader__.load` 包装
- 样式只用 `--dsw-*` 主题 token；locale 文案走 `ctx.get('locale')` 订阅
- 静态插件没有 `host.call`，client 取 host 数据走 HTTP 路由
- 语法验证：`node --check lib/*.js`（modules/ 有新模块时同样 `node --check`）
- DSH 契约与开发规范见 `docs/reference/dsh-plugin-spec.md`
