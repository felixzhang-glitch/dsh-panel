# 变更记录

> 每次需求/文档体系变更追加一条，倒序排列（最新在上）。时间格式 `YYYY-MM-DD`
>
> 分工：需求迭代记录继续走 `docs/requirements.md`（仓库既有约定），本文件记录 Harness 文档体系与平台级结构变更，避免双记

### 2026-08-30 Harness 文档体系补齐（二开模式）

- 变更内容：按 harness-init 二开模式补齐缺失文档：`PRODUCT.md` / `CHANGES.md` / `FRONTEND.md` / `SECURITY.md` / `RELIABILITY.md` / `TEST.md` / `QUALITY_SCORE.md`，并在 `docs/reference/` 追加第三方依赖条目；既有文档（AGENTS.md、design、architecture、requirements、plugin-guide、reference/）一律跳过未动
- 原因：建立多轮开发的完整上下文锚点
- 影响范围：无代码变更

> 2026-08-30 之前的项目历史见 `docs/requirements.md` 与 git log
