# dsh-token-usage

DeepSeek Harness 的模型用量统计插件，挂载在 设置 → 用量统计

## 功能

- 时间范围：最近 7 / 14 / 30 / 90 天与自定义区间
- 指标卡：Tokens 用量、完成轮次、请求数量、活跃天数、平均缓存命中率、最常用模型
- 活跃热力图：GitHub 贡献图风格，近 180 天 / 近 1 年可切换，格子尺寸随容器宽度自适应，溢出时自动定位到最近日期
- 按天 Token 趋势：top 5 模型堆叠柱 + 缓存命中率折线
- 模型用量：环图 + provider/model 明细与占比（名称与 provider 双行排布，窄宽度下不互相挤压）
- 数据源为会话日志 `assistant/message` 事件的 provider 上报用量；fork 会话继承历史不重复计数；服务端 60 秒缓存
- 界面全部走 `--dsw-*` 主题 token，与宿主深浅色主题一致；文案随 locale 中英切换

## 安装

要求：DSH 0.1.0-rc 系列，`dsh web` 部署，node 在 PATH

```
git clone git@github.com:felixzhang-glitch/dsh-token-usage.git
cd dsh-token-usage
./install.sh
```

脚本自动完成

1. 复制插件包到 `~/.dsh/profiles/web/dsh-token-usage/`
2. 建立模块解析符号链接（profile 树 + DSH 运行树 node_modules，运行树自动探测）
3. 在 `~/.dsh/profiles/web/cordis.patch.yml` 幂等追加挂载行

完成后重启 DSH，刷新页面，设置 → 用量统计

> 运行树自动探测失败时手动指定：`./install.sh <含 @deepseek-ai/dsh 的 node_modules 根目录>`

## 卸载

```
./uninstall.sh [DSH_ROOT]
```

移除挂载行（留备份 `cordis.patch.yml.bak-uninstall`）、符号链接与插件目录，重启生效

## 结构

```
package.json      # 双面声明：exports + dsh.client
lib/index.js      # host 半：注册 GET /token-usage/stats，扫描会话日志聚合
lib/client.js     # client 半：settings.section 三视图 UI
install.sh        # 安装脚本（幂等）
uninstall.sh      # 卸载脚本
```

## 兼容性

- 依赖契约：`sessionQuery.listSessions/readSession`、`webServer.register`、`settings.section` 槽位、`--dsw-*` token、ModuleLoader 包装格式
- 验证版本：DSH 0.1.0-rc.6

## 维护

> `dsh` 经 npx 升级会重建缓存目录，运行树符号链接失效，启动时该行加载失败；重跑 `install.sh` 即修复

开发·维护·部署文档见 [dsh-plugin-guide.md](docs/plugin-guide.md)（发布包内），插件市场见 [github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin)