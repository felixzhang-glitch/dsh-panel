# 安全要求

## 安全基线

- 密钥、密码、token 一律不进代码库；本仓库为本地插件仓库，不产生也不存储凭据
- 第三方模块纳管必须版本锁定：`third-party.json` 记录 pin 版本与验证过的 DSH 版本（`dshVerified`），升级走 `dspm update` 显式确认，不装 `@latest` 浮动版本
- `dspm add <pkg>` 前人工确认包来源与上游仓库（当前唯一第三方：omdsh-dev/DSH-better-sidebar，MIT）
- 所有模块只读写 DSH 契约暴露的服务与会话数据，不越权访问 `~/.dsh` 之外的用户文件

## 认证与授权

- 无独立认证体系：模块 HTTP 路由（如 `GET /token-usage/stats`）挂载在 DSH host 内，随宿主监听本地端口，信任边界等同 DSH 本身
- `TODO: 待补充`（若未来路由暴露到本机以外，需补鉴权约定）

## 数据安全

- 敏感数据清单：会话日志 `~/.dsh/sessions/**`（含对话原文）——聚合模块只提取 `usage` 数值，不落盘原文、不外发
- dspm 改写宿主文件（`cordis.patch.yml`、profile `package.json`）前先写 `.bak-*` 备份，卸载可恢复
- 备份策略：依赖 git 与 dspm `.bak-*` 机制，无额外备份需求

## 沙盒与演练纪律

- dspm 沙盒演练必须用临时 `DSH_HOME` + 显式 `--dsh-root <假运行树>`：运行树自动探测会优先命中正在运行的真实 dsh 进程，不显式传参会误触真机
- `dspm reload --restart` 会 kill DSH 断开所有会话，必须显式 `--yes` 才执行

## 已知风险与例外

| 风险 | 等级 | 处理状态 |
|---|---|---|
| bun 直装第三方包引入供应链风险（postinstall / 恶意依赖） | 中 | 通过 pin 版本 + trustedDependencies 白名单（仅 node-pty）收敛；纳管前人工确认上游 |
| 模块 HTTP 路由无鉴权，同机进程可读 | 低 | 自用单机场景接受；仅在本地监听 |
