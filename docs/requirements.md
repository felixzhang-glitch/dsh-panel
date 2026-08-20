# 需求迭代记录

## 格式约定

- 按时间倒序追加，最新在最上
- 每条含：日期、所属模块、版本、需求描述、状态（进行中 / 已完成）
- 只记录需求与结果，实现细节进 `architecture.md` 或代码注释

## 记录

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
