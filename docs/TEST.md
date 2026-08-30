# 测试要点

## 测试策略

- 测试层级：当前无自动化测试框架；验证分三层——语法静态检查（`node --check`）、dspm 沙盒演练（临时 `DSH_HOME` + `--dsh-root` 假运行树）、实机浏览器人工验证
- 运行方式：
  - 语法：`node --check lib/*.js`、`node --check modules/*/lib/*.js`、`node --check dspm`
  - 沙盒：`DSH_HOME=<临时目录> ./dspm <command> --dsh-root <假运行树>`（沙盒需自带 dspm + third-party.json + package.json 副本；非交互 shell 需把 fnm node 与 `~/.bun/bin` 加进 PATH）
  - 实机：`dspm reload <target>` 重同步后浏览器硬刷新（client）或 `--restart --yes`（host）
- 覆盖率要求：不设量化指标；每次改动必须过语法检查，涉及安装/卸载通道的改动必须过沙盒演练

## 测试要点

> 记录必须验证的关键点，尤其是易回归、易遗漏的场景

1. dspm 幂等性：install 重跑修复断链缺行，不产生重复挂载
2. 双通道互斥：自有模块（符号链接 + patch 行）与第三方（bun bundle）不得混用，手写挂载行 + bundle 双挂载会导致启动失败
3. bun 装后处理：prunePeers 剪净 `@deepseek-ai/*` 与 peer（防宿主双实例）、fixExecBits 恢复 node-pty `spawn-helper` 可执行位、reconcileBundles 登记正确
4. token-usage 缓存行为：60s TTL + single-flight；`?refresh=1` 连发第二次 `generatedAt` 不变（5s 冷却）
5. time-awareness 注入边界：step 1 才注入、节流命中放行、非法配置 apply 期 fail loud、注入异常只告警不挂 turn
6. 沙盒纪律：演练必须显式 `--dsh-root`，否则自动探测命中真机运行树

## 要点与用例映射

> 本项目暂无自动化测试用例，映射表留空；历史验证记录见 `docs/requirements.md` 各条目「验证」字段

| 测试要点 | 用例路径 | 类型 |
|---|---|---|
| - | - | - |

## 手工验证清单

- token-usage UI：三视图渲染、时间范围切换、中英 locale、主题适配、空数据态、`?refresh=1` 强刷
- time-awareness：发起一轮对话后检查会话历史中出现 sourced 时间读取消息
- better-sidebar：右侧栏文件树 / 编辑器 / 终端（PTY）/ Git / 文件预览逐项点开
- `dspm list` / `doctor` 输出与实机安装状态一致
