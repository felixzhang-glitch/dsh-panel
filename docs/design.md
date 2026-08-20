# dsh-panel 设计文档

## 定位

dsh-panel 是 DeepSeek Harness (DSH) 的静态插件集合仓库，一个模块对应一个可独立安装/卸载的插件包，随 DSH 启动持久加载。设计基线与 `plugin-guide.md` 描述的 DSH 静态插件模型完全一致，本文只记录平台级决策，实现细节指回 `plugin-guide.md`

> 适用对象：DSH 0.1.0-rc 系列，`dsh web` 部署

## 模块清单

| 模块 | 功能 | 挂载位置 | 状态 |
| --- | --- | --- | --- |
| dsh-token-usage | 模型用量统计（指标卡、热力图、按天趋势、模型用量） | 设置 → 用量统计 | 已发布 v0.2.0 |
| dsh-better-sidebar（第三方） | VSCode 式右侧栏工作台：文件树 / 编辑器 / 终端 / Git / 浏览器 / 文件预览 | 右侧栏 + 底部面板 | npm v0.14.0，bundle 通道接入 |

## 通用设计原则

所有模块共同遵守，与 DSH 插件契约对齐：

- 静态插件形态：npm 风格包 + `cordis.patch.yml` 一行挂载，不做动态插件（无跨重启保留能力）
- Host/Client 双端分工：host 半提供数据（注册 HTTP 路由），client 半只做展示（fetch 取数）；静态插件没有 `host.call`，跨端通信一律走 HTTP
- 副作用可逆：host 一切注册/订阅必须包在 `ctx.effect` 内并返回 disposer；client 样式随插件生命周期进出
- 依赖显式声明：host 用 `inject` 列硬依赖服务，client 在 `package.json` 的 `dsh.client.inject` 列运行时/槽位包
- 主题与 locale 随宿主：样式只用 `--dsw-*` token，文案随 locale 中英切换，不自造色值与硬编码文案
- 零重依赖倾向：能用 DOM/SVG/CSS 表达的可视化不引图表库

## 模块边界约定

- 自有新模块落 `modules/<模块名>/` 子目录（dsh-token-usage 为历史原因位于仓库根），符号链接 + patch 行通道安装
- 成熟的第三方能力优先以 npm 包 + 官方 bundle 通道接入（如 dsh-better-sidebar），不重复造轮子；bundle 通道与手动 patch 行互斥，禁止双挂载
- 模块间不共享运行时状态；如需公共能力，先抽平台层再引用
- 每个模块的依赖契约（服务、槽位、token、验证版本）在其文档中显式列出
