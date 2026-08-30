# 产品文档

## 产品定位

dsh-panel 是 DeepSeek Harness (DSH) 的静态插件集合仓库（自用，仅 macOS），一个模块对应一个可独立安装/卸载的插件包；统一命令 `dspm` 纳管自有模块与第三方插件，按需挂载到 `dsh web` 部署

## 功能项清单

> 新增需求先更新本表再开发（需求细节同步进 `docs/requirements.md`），保证多轮开发不偏离。状态取值：规划中 / 开发中 / 已完成 / 已废弃

| 功能 | 状态 | 描述 |
|---|---|---|
| dsh-token-usage | 已完成 v0.2.1 | 模型用量统计面板：指标卡、活跃热力图、按天趋势（top5 模型堆叠柱 + 缓存命中率折线）、模型占比环图；挂载设置 → 用量统计 |
| dsh-time-awareness | 已完成 v0.1.0 | 时间感知：每轮 step 1 注入一条带时区的时间读取（时间戳、浏览器时区策略、耗时），host-only 无 UI |
| dsh-better-sidebar 接入 | 已完成 0.14.0 | 第三方 VSCode 式工作台（文件树 / 编辑器 / 终端 / Git / 内嵌浏览器 / 文件预览），`third-party.json` 登记 + dspm bun 通道纳管 |
| dspm 统一管理命令 | 已完成 | `list / install / uninstall / reload / add / update / pin / doctor`，自有符号链接通道 + 第三方 bun bundle 通道，模块自动发现 |

## 非目标

> 明确不做什么，防止范围蔓延

- 不自建侧边栏 / 编辑器 / 文件预览：由第三方 dsh-better-sidebar 提供，后续自有模块如需 UI 优先扩展其 `ctx.betterSidebar` 服务
- 不做金额 / 成本统计：用量面板只统计 token 与轮次（2026-08-23 审查时明确决策）
- 不做动态插件：所有模块为静态插件形态，随 DSH 启动持久加载，无跨重启保留能力
- 不支持 Windows / Linux：dspm 与安装通道仅适配 macOS
- 不做增量聚合：session header 无更新时间戳、`readSession` 只能全量读，维持全量扫 + 60s 缓存

## 用户反馈与待验证问题

- `TODO: 待补充`（自用项目，问题与决策直接记入 `docs/requirements.md`）
