## dsh-better-sidebar

- 类型：第三方包（DSH 插件，npm 包形态）
- 用途：VSCode 式右侧栏工作台（文件树 / CodeMirror 编辑器 / 终端 / Git / 内嵌浏览器 / 文件预览），本仓库不自建侧边栏能力
- 文档链接：上游仓库 github.com/omdsh-dev/DSH-better-sidebar（MIT），源码以上游为准
- 版本：pin 0.14.0（`third-party.json`），适配 DSH 0.1.0-rc.8

### 关键用法

- 纳管：`dspm add dsh-better-sidebar@<ver>` 登记 registry 后经 bun 通道安装；升级 `dspm update`、锁版回滚 `dspm pin`
- bundle 通道：不建符号链接、不写 patch 行（手写挂载行与 bundle 双挂载导致启动失败）；装后 prunePeers 剪除全部 `@deepseek-ai/*` / react / cordis 防宿主双实例，fixExecBits 恢复 node-pty `spawn-helper` 可执行位
- 扩展点：暴露 `ctx.betterSidebar` 服务（registerTab / registerFileViewer），自有模块需要面板时优先扩展它而非自建
- 版本耦合：升级前先确认 DSH 运行树版本（`dshVerified` 字段）

### 来源

仓库 README 与 docs/architecture.md 既有记录，2026-08-30
