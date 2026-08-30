## bun

- 类型：第三方工具（JS 运行时 / 包管理器）
- 用途：dspm 第三方 bundle 通道的安装器——`bun add` 直装进 profile，替代官方 `dsh plugin` 的 pnpm 转发（直连 npmjs 分钟级卡死，bun 冷装约 28s、缓存命中 <1s）
- 文档链接：bun.sh
- 版本：无锁定，取 `~/.bun/bin` / `$BUN_INSTALL/bin` / PATH 解析到的可用版本

### 关键用法

- 路径解析顺序：`$BUN_INSTALL/bin` → `~/.bun/bin` → PATH；非交互 shell 演练需手动把 `~/.bun/bin` 加进 PATH
- 已知坑一：强制自动装 peer 且无开关——装后必须 prunePeers 剪除全部 `@deepseek-ai/*` 与 peer，否则与宿主 cordis 双实例
- 已知坑二：解包丢文件可执行位——需 fixExecBits 恢复 node-pty `spawn-helper` 的 +x
- 原生构建放行：profile `package.json` 的 `trustedDependencies` 白名单（当前仅 `node-pty`，实测走自带 prebuild）

### 来源

docs/requirements.md「dspm bundle 通道 pnpm → bun 迁移」条目实测记录，2026-08-30
