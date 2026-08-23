# 需求迭代记录

## 格式约定

- 按时间倒序追加，最新在最上
- 每条含：日期、所属模块、版本、需求描述、状态（进行中 / 已完成）
- 只记录需求与结果，实现细节进 `architecture.md` 或代码注释

## 记录

### 2026-08-23 dsh-token-usage v0.2.1 审查修复

- 模块：dsh-token-usage
- 需求：全量审查插件能力，修复确认的问题
  - 审查结论：聚合逻辑（60s 缓存 + single-flight、fork seed 去重、turns 按 `会话:轮次` 去重）健康无需动；增量聚合不可行（session header 无更新时间戳、`readSession` 只能全量读），维持全量扫 + 缓存；明确不引入金额/成本统计
- 结果（3 处修复 + 1 处文档化）：
  - client `Dashboard` 卸载竞态：fetch 挂 `AbortController`，槽位卸载/重复加载时 abort，AbortError 静默（消除切页时的 setState-on-unmounted 警告与旧响应闪屏）
  - host `collect` worker 队列 `queue.shift()`（O(n²)）改共享索引游标
  - `?refresh=1` 强刷加 5s 冷却（`REFRESH_MIN_MS`），防连点触发全量重扫
  - 头注释补 fork 去重边界：父会话不在语料（已删除）时继承 seed 历史重复计入，低概率已知边界
- 验证：`node --check` 双文件通过；`dspm reload` 重同步；`?refresh=1` 连发两次第二次 `generatedAt` 不变；`doctor` all good
- 状态：已完成

### 2026-08-23 dspm bundle 通道 pnpm → bun 迁移

- 模块：平台
- 需求：第三方 bundle 安装通道从 `dsh plugin add`（pnpm 转发）迁移为 bun 直装
  - 动因：`dspm reload dsh-better-sidebar` 分钟级卡死——官方 `dsh plugin` 是纯 pnpm 转发器，pnpm 直连 npmjs 拉 342 个包慢且不稳
- 结果：
  - dspm bundle 通道重写为 `bun add`（cwd=profile）：冷装 28s / 缓存命中 <1s，删除 `dshCli()`；bun 路径按 `$BUN_INSTALL/bin` → `~/.bun/bin` → PATH 兜底解析
  - 对抗 bun 强制自动装 peer（无开关）：`prunePeers` 装后剪除 profile node_modules 下全部直接 peer 与所有 `@deepseek-ai/*`（含传递 peer），终态与官方通道 `autoInstallPeers: false` 一致，防插件与宿主 cordis 双实例
  - `fixExecBits`：bun 解包丢文件可执行位，恢复 node-pty `spawn-helper` 的 +x（终端功能依赖）；原生构建放行改 `trustedDependencies: ["node-pty"]`（实测 node-pty 1.1.0 走自带 prebuild，不从源码编译；`npm_config_disturl` 镜像保留作保险）
  - `dsh.profile.bundles` 登记由 dspm `reconcileBundles` 自理（复刻官方 reconcilePlugins：声明 `dsh.bundle.patch` 才登记，卸载摘除）；`pnpm-workspace.yaml` 的 allowBuilds 保留，留给官方通道兜底
  - 顺手修复：`REPO_ROOT` 遗留 `..`（dspm 已从 `bin/` 移至仓库根，原值指向仓库父级导致 registry 读不到）
- 验证：`node --check` 通过；沙盒（临时 DSH_HOME + 假运行树）全流程通过（peer 剪净、PTY spawn 可用、bundles 登记正确）；实机 `reload dsh-better-sidebar` 2.4s 完成，`doctor` all good；`pnpm-lock.yaml` 保留作回退存档
- 状态：已完成

### 2026-08-23 平台统一管理命令 dspm

- 模块：平台
- 需求：插件统一管理（自用，仅 macOS）。自有模块 + 第三方优秀插件统一纳管，支持单模块安装/卸载/reload 重加载；维护命令合并为单入口，不同传参调整，支持 `-h`
- 结果：
  - 新增 `bin/dspm.mjs` 单命令（node，零三方依赖）：`list / install / uninstall / reload / add / update / pin / doctor`，全局与命令级 `-h`；install.sh / uninstall.sh 删除，逻辑移植并修复两处旧问题（卸载后 patch 文件结尾缺换行、CJK 表格对齐）
  - 模块自动发现：仓库根包 + `modules/*` + `third-party.json` registry，target 可省 `dsh-` 前缀，消灭硬编码 case
  - 第三方纳管：新增 `third-party.json` registry（name / spec pin / channel / note / dshVerified），dsh-better-sidebar 迁入；`dspm add <pkg>[@ver]` 一条命令完成校验 → 登记 → bundle 通道安装；`update` 升 pin、`pin` 锁版
  - reload 语义落地：重同步文件（自有重拷 / 第三方按 pin 重装）+ 按模块形态提示生效方式；`--restart --yes` kill 后以 `bunx @deepseek-ai/dsh@latest web` 后台拉起（日志 `~/.dsh/dspm-restart.log`），`--no-start` 只杀不起
  - doctor 体检：链接 A/B 断链（npx/bunx 升级后链接 B 失效）、patch 行缺失、bundle 未登记、registry pin 与实装版本错配、`.bak-*` 残留；`dspm uninstall --prune-backups`（不传 target）仅清理备份
  - 运行树探测增强：优先命中正在运行的 dsh web 进程，兼容 bunx 临时缓存（原脚本只探 PATH + npx 缓存）；沙盒演练须显式 `--dsh-root` 防止误触真机运行树
- 验证：`node --check` 通过；临时 DSH_HOME 沙盒 install/reload/uninstall/prune 全流程通过；实机 `list` / `doctor` 与实际安装一致（演练中误删的真机链接 B 已用 `dspm install dsh-token-usage` 幂等修复），doctor all good
- 状态：已完成

### 2026-08-20 dsh-better-sidebar vendor 回退，恢复 npm bundle 通道

- 模块：dsh-better-sidebar
- 需求：评估 vendor 内化方案后决定回退，恢复第三方 npm 包 + 官方 bundle 通道接入
  - 当日曾完成 vendor 内化（src + 预构建 lib 进 modules/、安装改 pnpm workspace 本地通道），权衡后放弃：失去上游自动供版、仓库 +11M、多两条软链维护责任（Node ESM 按 realpath 解析需桥接 node_modules），自用场景收益不抵成本
  - 回退动作：install.sh / uninstall.sh 与文档 git 恢复原口径，modules/dsh-better-sidebar 删除，profile 的 workspace 登记清理，重走 `dsh plugin --profile web add` 安装
- 结果：恢复为 dsh-better-sidebar@0.14.0 npm bundle 通道安装
- 状态：已完成

### 2026-08-20 dsh-time-awareness v0.1.0

- 模块：dsh-time-awareness
- 需求：时间感知插件，保证每一轮对话注入一条时间信息，让模型具备墙上时钟感知
  - `agent/pre-step` prepend 监听器，默认每轮第一条模型请求（step 1）注入一条 sourced user 消息；`everyStep: true` 切换为每 step 注入
  - 注入三行：ISO 形带时区时间戳（优先取浏览器时区，回退配置/进程时区）、浏览器时区策略（resolved/mixed/missing）、距上一条模型可见消息的耗时
  - 配置 `timeZone` / `refreshIntervalMs` / `everyStep`，手写校验（profile 目录无法解析运行树裸包名，不引 schemastery），非法配置加载期 fail loud
  - 节流无状态：倒序扫 session 事件找本插件最近注入，compaction/resume 后仍正确；注入失败只告警不挂 turn
- 结果：mock 冒烟 21 项通过；临时 DSH_HOME 沙盒安装/卸载演练通过；实机安装成功（patch 行 + 双链接），待重启 DSH 生效
- 状态：已完成

### 2026-08-20 README 平台口径重写

- 模块：平台
- 需求：README 从 dsh-token-usage 单插件口径重写为 dsh-panel 平台口径（模块清单、统一安装/卸载双通道说明、结构、文档索引、维护注意事项）；仓库已更名 felixzhang-glitch/dsh-panel
- 状态：已完成

### 2026-08-20 回退 dsh-session-files，接入 dsh-better-sidebar

- 模块：平台
- 需求：手写的会话文件面板（dsh-session-files v0.1.0）回退删除（环境卸载 + 目录删除）；侧边栏/文件预览改用第三方 dsh-better-sidebar，安装逻辑合并进统一 install.sh（极简版：allowBuilds 预写 + 官方 CLI 安装 + bundles 校验，无 Windows 兼容）
- 结果：dsh-better-sidebar@0.14.0 经 bundle 通道安装成功（profile dependencies `^0.14.0`，bundles 已登记）；注意 `@latest` 直传会被 profile 既有依赖声明遮蔽，脚本改为 npm view 显式解析版本号
- 状态：已完成（待重启 DSH 实机验证右侧栏）

### 2026-08-20 平台统一安装入口

- 模块：平台
- 需求：外层 `install.sh`/`uninstall.sh` 改为统一入口，默认安装/卸载全部模块（根包 + `modules/*`），支持指定单个模块；兼容旧用法（第一参传 DSH_ROOT）；模块自带脚本保留供独立分发
- 状态：已完成（临时 DSH_HOME 沙盒演练卸载分发通过，实机安装 dsh-session-files 成功）

### 2026-08-20 dsh-session-files v0.1.0

- 模块：dsh-session-files
- 需求：对话侧边栏文件模块（参考 Qoder Quest，仅文件视图）
  - 左栏底部按钮触发，右侧浮动面板展示当前会话工作区目录树（懒加载）
  - 点击文件预览：md 默认渲染（内置极简渲染器），html/pdf/图片等经 iframe/img 支持，其余文本 pre 展示，未知类型给提示
  - 安全：路径围栏在会话 cwd 内（越界 403），单文件预览上限 20MB
- 状态：已完成（mock 验证 19 项通过，待实机安装验证）

### 2026-08-20

- 模块：平台
- 版本：-
- 需求：初始化 dsh-panel 文档体系（AGENTS.md 代码地图、设计/架构文档、需求迭代记录、reference 参考资料）
- 状态：已完成

### dsh-token-usage v0.2.0

- 模块：dsh-token-usage
- 需求：用量统计面板完整功能
  - 时间范围：最近 7 / 14 / 30 / 90 天与自定义区间
  - 指标卡：Tokens 用量、完成轮次、请求数量、活跃天数、平均缓存命中率、最常用模型
  - 活跃热力图（近 180 天 / 近 1 年切换，格子自适应）
  - 按天 Token 趋势：top 5 模型堆叠柱 + 缓存命中率折线
  - 模型用量：环图 + provider/model 明细占比
  - fork 会话继承去重、服务端 60 秒缓存、主题 token 适配、中英 locale
- 状态：已完成

### dsh-token-usage v0.1.0

- 模块：dsh-token-usage
- 需求：初始版本（细节待补）
- 状态：已完成
