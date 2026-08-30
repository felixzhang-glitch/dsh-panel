## @deepseek-ai/dsh 系列包

- 类型：第三方包（DSH 平台，npm scope `@deepseek-ai`）
- 用途：宿主平台本体与 client 侧运行时/槽位包；模块通过 `inject` 声明依赖，不直接 import
- 文档链接：插件契约见 `docs/reference/dsh-plugin-spec.md` 与 `docs/plugin-guide.md`；插件市场 github.com/topics/dsh-plugin
- 版本：验证版本 DSH 0.1.0-rc.6（token-usage）/ rc.8（time-awareness、better-sidebar 0.14.0）

### 关键用法

- host 侧：运行 `bunx @deepseek-ai/dsh@latest web`；dspm `--restart` 即以此命令后台拉起（日志 `~/.dsh/dspm-restart.log`）
- client 侧 inject（`package.json` 的 `dsh.client.inject`）：`@deepseek-ai/dsh-client-runtime`（ModuleLoader / ctx）、`@deepseek-ai/dsh-client-ui-settings`（settings.section 槽位）
- 版本敏感：npx/bunx 升级会重建缓存目录导致运行树链接 B 失效，升级后必须 `dspm doctor` + `install all`；模块升级前核对 `dshVerified`

### 来源

仓库 README 维护节与各模块依赖契约，2026-08-30
