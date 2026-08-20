# 需求迭代记录

## 格式约定

- 按时间倒序追加，最新在最上
- 每条含：日期、所属模块、版本、需求描述、状态（进行中 / 已完成）
- 只记录需求与结果，实现细节进 `architecture.md` 或代码注释

## 记录

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
