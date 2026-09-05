# 可靠性与运维

## 可靠性目标

- 可用性目标：自用单机工具，无 SLA；底线是任何安装/卸载/升级操作可回滚、不破坏 `~/.dsh` 运行树
- 数据持久性要求：模块不产生业务数据；会话日志归 DSH 所有，模块只读

## 监控与告警

- 日志：dsh web 服务日志 `~/.dsh/dsh-web.log`（`dspm web log` 可查尾）；模块异常走 `ctx.logger.warn`（time-awareness 注入失败只告警不挂 turn）
- 健康检查：`dspm doctor`——断链（链接 A/B）、patch 行缺失、bundle 未登记、registry pin 与实装版本错配、`.bak-*` 备份残留
- 告警渠道与阈值：无（自用，靠 doctor 主动巡检）

## 故障处理

- 常见故障与处置：
  - `dsh` 经 npx/bunx 升级后链接 B 失效 → `dspm doctor` 检出，`dspm install all` 幂等修复
  - 启动失败（duplicate prefix route）→ 检查是否对 bundle 通道模块手写挂载行（双挂载），删除手写行
  - 终端 PTY 不可用 → `fixExecBits` 未生效，重跑 `dspm install dsh-better-sidebar`
  - web 无 HMR：client 半改动硬刷新生效；host 半 / patch 行改动需 `dspm reload <target> --restart --yes`
- 回滚方式：`dspm uninstall <target>`（patch 行与链接自动还原 `.bak-*` 备份）；第三方版本回滚 `dspm pin <pkg> <旧版本>`

## 运维清单

- 部署方式：本地安装，`./dspm install all`；运行环境要求 macOS + DSH 0.1.0-rc 系列（已初始化 `~/.dsh/profiles/web/`）+ node 在 PATH，第三方安装另需联网与 bun
- 定时任务：无
- 升级流程：第三方 `dspm update`（npm view 最新版 → 更新 pin → 重装）；DSH 本体升级后必须 `dspm doctor` + `install all` 修链
