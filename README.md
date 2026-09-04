# dsh-panel

DeepSeek Harness (DSH) 插件集合仓库，统一命令纳管自有模块与第三方插件，按需挂载

## 模块

| 模块 | 形态 | 功能 | 挂载位置 |
| --- | --- | --- | --- |
| dsh-token-usage | 自有（仓库根） | 模型用量统计：指标卡、活跃热力图、按天趋势、模型占比 | 设置 → 用量统计 |
| dsh-time-awareness | 自有（modules/） | 时间感知：每轮对话注入一条带时区的时间读取，让模型感知墙上时钟 | 无 UI，注入会话历史 |
| dsh-better-sidebar | 第三方（registry 纳管） | VSCode 式工作台：文件树 / 编辑器 / 终端 / Git / 内嵌浏览器 / 文件预览 | 右侧栏 + 底部面板 |

后续新增自有模块落 `modules/<模块名>/`，零配置被 dspm 自动发现；第三方插件 `dspm add <pkg>[@版本]` 一条命令纳管（登记 `third-party.json`）

> dsh-better-sidebar 出处：[omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)（MIT），本仓库只维护纳管编排，源码以上游为准

## 管理命令 dspm

要求：macOS，DSH 0.1.0-rc 系列且初始化过（存在 `~/.dsh/profiles/web/`），node 在 PATH；第三方安装另需联网与 [bun](https://bun.sh)

```
git clone git@github.com:felixzhang-glitch/dsh-panel.git
cd dsh-panel
./dspm.mjs install all      # 装全部
```

单命令多传参，`-h` 看全量帮助，`dspm <command> -h` 看单命令用法：

| 命令 | 说明 |
| --- | --- |
| `dspm list` | 模块清单 + 安装状态（链接 / patch 行 / bundle 登记） |
| `dspm install <target\|all>` | 安装；幂等，断链缺行重跑即修复 |
| `dspm uninstall <target\|all>` | 卸载；`--prune-backups` 不传 target 时仅清 `.bak-*` 残留 |
| `dspm reload <target>` | 重同步模块文件（自有重拷 / 第三方按 pin 重装） |
| `dspm add <pkg>[@ver]` | 纳管第三方：校验 → 登记 third-party.json → bun 通道安装 |
| `dspm update [target]` | 第三方升级到 npm 最新版并更新 pin |
| `dspm pin <pkg> <ver>` | 锁定第三方版本并重装 |
| `dspm doctor` | 体检：断链 / patch 缺失 / bundle 未登记 / 版本错配 / 备份残留 |

target 为模块名（可省 `dsh-` 前缀），默认 all；运行树 node_modules 根自动探测，探不到用 `--dsh-root <path>`

两条安装通道：

- 自有模块：复制包到 profile + 双符号链接 + `cordis.patch.yml` 幂等挂载行
- 第三方：dspm 以 `bun add` 直装进 profile（替代官方 `dsh plugin` 的 pnpm 转发，快且稳），装后自动剪除 peer（bun 强制装 peer，留着与宿主双实例）、恢复 node-pty 预构建产物的可执行位，并登记进 `dsh.profile.bundles`；不写挂载行（手写会与 bundle 双挂载导致启动失败）

## reload 与重启

web profile 无 HMR：

- client 半改动 → 浏览器硬刷新即生效
- host 半 / patch 行改动 → 需重启 DSH：`dspm reload <target> --restart --yes`（kill 后以 `bunx @deepseek-ai/dsh@latest web` 后台拉起，日志 `~/.dsh/dspm-restart.log`；会断开当前所有会话，故必须显式 `--yes`）

## 结构

```
dspm              # 统一管理命令（仓库根，单入口，零三方依赖）
third-party.json  # 第三方模块 registry（名称 / pin 版本 / 通道 / 备注）
package.json      # dsh-token-usage 双面声明：exports + dsh.client
lib/              # dsh-token-usage host 半 + client 半
modules/          # 自有新模块目录（dsh-time-awareness 等）
docs/             # 设计 / 架构 / 需求迭代 / 参考资料
```

## 文档

| 路径 | 内容 |
| --- | --- |
| `AGENTS.md` | 代码地图与核心指令 |
| `docs/design.md` | 平台设计与模块清单 |
| `docs/architecture.md` | 模块架构与接入通道 |
| `docs/requirements.md` | 需求迭代记录 |
| `docs/plugin-guide.md` | DSH 插件开发·维护·部署指南 |
| `docs/reference/` | DSH 插件开发规范等参考资料 |

## 维护

> `dsh` 经 npx/bunx 升级会重建缓存目录，自有模块的运行树链接 B 失效；`dspm doctor` 能检出，`dspm install all` 一键修复

- dsh-token-usage 依赖契约：`sessionQuery`、`webServer.register`、`settings.section` 槽位；验证版本 DSH 0.1.0-rc.6
- dsh-time-awareness 依赖契约：`agents` 注册表的 `agent/pre-step` 瀑布；patch 行可选 config（`timeZone` / `refreshIntervalMs` / `everyStep`）；验证版本 DSH 0.1.0-rc.8
- dsh-better-sidebar 0.14.0 适配 DSH 0.1.0-rc.8，升级前先确认运行树版本（`dspm update` 前同理）

插件市场见 [github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin)
