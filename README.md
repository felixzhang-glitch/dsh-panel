# dsh-panel

DeepSeek Harness (DSH) 插件集合仓库，统一安装入口，按需挂载

## 模块

| 模块 | 形态 | 功能 | 挂载位置 |
| --- | --- | --- | --- |
| dsh-token-usage | 自有（仓库根） | 模型用量统计：指标卡、活跃热力图、按天趋势、模型占比 | 设置 → 用量统计 |
| dsh-better-sidebar | 第三方（npm 接入） | VSCode 式工作台：文件树 / 编辑器 / 终端 / Git / 内嵌浏览器 / 文件预览 | 右侧栏 + 底部面板 |

后续新增自有模块落 `modules/<模块名>/`，接入时登记到 `docs/design.md` 模块清单

## 安装

要求：DSH 0.1.0-rc 系列且初始化过（存在 `~/.dsh/profiles/web/`），node 在 PATH；better-sidebar 另需联网与 pnpm

```
git clone git@github.com:felixzhang-glitch/dsh-panel.git
cd dsh-panel
./install.sh              # 装全部
```

指定目标：

```
./install.sh dsh-token-usage       # 只装用量统计
./install.sh dsh-better-sidebar    # 只装侧边栏（官方 bundle 通道）
./install.sh all <DSH_ROOT>        # 手动指定 DSH 运行树 node_modules 根
```

两条安装通道：

- 自有模块：复制包到 profile + 双符号链接 + `cordis.patch.yml` 幂等追加挂载行
- better-sidebar：`dsh plugin --profile web add` 官方 CLI，注册进 `dsh.profile.bundles`，不写挂载行（手写会与 bundle 双挂载导致启动失败）

完成后重启 DSH（better-sidebar 浏览器需硬刷新）

## 卸载

```
./uninstall.sh [TARGET] [DSH_ROOT]
```

TARGET 同安装（默认 all）；自有模块移除挂载行（留备份 `.bak-uninstall`）、链接与包目录，better-sidebar 走 `dsh plugin remove`

## 结构

```
package.json      # dsh-token-usage 双面声明：exports + dsh.client
lib/index.js      # host 半：注册 GET /token-usage/stats，扫描会话日志聚合
lib/client.js     # client 半：settings.section 三视图 UI
modules/          # 自有新模块目录（预留）
install.sh        # 统一安装入口（幂等）
uninstall.sh      # 统一卸载入口
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

> `dsh` 经 npx 升级会重建缓存目录，自有模块的运行树符号链接失效，重跑 `./install.sh` 即修复

- dsh-token-usage 依赖契约：`sessionQuery`、`webServer.register`、`settings.section` 槽位；验证版本 DSH 0.1.0-rc.6
- dsh-better-sidebar 0.14.0 适配 DSH 0.1.0-rc.8，升级前先确认运行树版本

插件市场见 [github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin)
