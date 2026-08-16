## DSH 插件开发·维护·部署指南

以 `dsh-token-usage`（Token 消耗看板）为实例，覆盖静态 Cordis 插件从开发到分发的完整链路

> 适用对象：DeepSeek Harness 0.1.0-rc 系列，`dsh web` 部署
> 实例插件：设置页 Token 用量看板，host 聚合 `/token-usage/stats` 路由 + client 三视图 UI

## 插件的两种形态

- 动态插件：会话内 `cordis_define/cordis_run` 热挂载，进程重启即消失，适合临时扩展与实验
- 静态插件：一个 npm 风格包 + 组合（composition）里的一行，随 DSH 启动加载，持久存在，适合长期功能

> 本指南只讲静态插件；动态插件受会话审批与模型工具通道限制，且不能跨重启保留

## 插件解剖

### 目录结构

```
dsh-token-usage/
├── package.json      # 双面声明：exports + dsh.client
└── lib/
    ├── index.js      # host 半：ESM，export { apply, inject, name }
    └── client.js     # client 半：window.__ModuleLoader__.load 包装的浏览器 bundle
```

一个包同时承载 host 与 client 两面，组合里只需一行

### package.json 契约

```json
{
  "name": "dsh-token-usage",
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".":            { "default": "./lib/index.js" },
    "./client":     { "default": "./lib/client.js" },
    "./package.json": "./package.json"
  },
  "dsh": {
    "client": {
      "inject": [
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-ui-settings"
      ],
      "platform": "web"
    }
  }
}
```

要点

- `exports["./client"]`：client-modules 用它定位浏览器 bundle，支持字符串或 `{ default }` 条件形式
- `exports["./package.json"]`：必须显式导出，`require.resolve('<name>/package.json')` 才能穿透 exports 映射
- `dsh.client.inject`：client 条目依赖的包名列表，控制实例化顺序；写实际会用到的运行时/槽位包
- `dsh.client.platform`：必须与部署面匹配（web）

### host 半（lib/index.js）

```js
const name = "token-usage";
const inject = ["webServer", "sessionQuery"];   // 硬依赖服务，缺一个就等待不激活

function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({ kind: "exact", path: "/token-usage/stats", handler }),
    "token-usage stats route"
  );
}

export { apply, inject, name };
```

规则

- 顶层导出 `apply / inject / name`，纯 ESM（包声明 `"type": "module"`）
- `inject` 里的服务经 `ctx.<服务名>` 直接访问；可选服务用 `ctx.get(name)` 并处理 undefined
- 一切副作用必须可逆：`ctx.effect(fn, label)` 的返回值是 disposer，卸载时自动调用；`webServer.register` 本身返回注销函数，可直接作为 effect 体
- 不允许持有跨 effect 的未清理资源（定时器、监听器等同理）

### client 半（lib/client.js）

浏览器 bundle 不经打包器转换，必须手写 CJS 风格的 ModuleLoader 包装

```js
window.__ModuleLoader__.load({
  id: "dsh-token-usage",          // 与包名一致
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    let react = require("react"); // shell 提供的静态模块，可直接 require

    function apply(ctx) {
      ctx.effect(() => {          // 样式随插件生命周期进出
        const tag = document.createElement("style");
        tag.textContent = CSS;
        document.head.appendChild(tag);
        return () => tag.remove();
      }, "styles");

      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "token-usage",
        order: 90,
        label: () => "Token 用量"  // 支持函数形式，运行时取 locale 文案
      }, () => react.createElement(Dashboard)));
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    exports.name = "token-usage-ui";
    return module.exports;
  }
});
```

规则

- 执行 bundle 只注册 factory；真实副作用全部发生在 materialize（首次被 import）时的 factory 闭包内
- `require` 只能取已注册的模块（react、shell 静态模块、其他已加载插件）；跨插件取值导入是构建期错误，不要写
- React 组件用 `react.createElement`，无 JSX
- 槽位注册走 `ctx.slots.inject(key, () => ctx.slots.register(options, Component))`：槽位未声明时自动等待，不依赖加载顺序
- 样式只使用 `--dsw-*` 主题 token（`--dsw-alias-*` 语义别名、`--dsw-static-*` 固定色、`--dsw-font-*` 字号变量），自动适配深浅色
- locale：`ctx.get('locale').getSnapshot().active` 读当前语言，`.subscribe(fn)` 订阅切换；返回的 disposer 交给 `react.useEffect`
- 静态插件没有 `host.call`；client 取 host 数据要走 host 半注册的 HTTP 路由（本例 `fetch('/token-usage/stats')`）

### 挂载：cordis.patch.yml

用户侧挂载点是 profile 的 patch 文件（`~/.dsh/profiles/web/cordis.patch.yml`），顶层数组，每个元素是一条 patch

```yaml
- insert:
    - id: token-usage
      name: 'dsh-token-usage'
```

语义

- `insert` 不带 `id` → 追加到组合根列表末尾；带 `id` → 追加进某个 group 条目
- 不带 `insert` 的 patch 是覆盖：`{ id, name?, ...overrides }` 按 id 定位已有行改字段
- 匹配不到的 patch 只警告跳过，不致命；但行加载失败会导致启动失败（fail loud）
- patch 文件用 js-yaml 解析（JSON_SCHEMA + `!!js` 扩展），注释自由
- web profile 的 HMR 行默认禁用 → 改 patch 必须重启生效

> 绝不改随发行包安装的 shipped preset（`agent-presets` 目录），升级会覆盖；用户层只动 `cordis.patch.yml`

### 模块解析的两条链路（为什么要两个符号链接）

裸包名 `dsh-token-usage` 要在两个互不相通的解析上下文里都能命中

1. client 侧：client-modules 用 `createRequire(ctx.baseUrl)` 解析 `<name>/package.json`，`baseUrl` 是 profile 目录 → 向上查找 `node_modules`，命中 `~/.dsh/profiles/node_modules/`
2. host 侧：Loader 对裸名执行 `await import(name)`，解析上下文是运行树内的 loader 包 → 命中运行树（npx 缓存或安装目录）的 `node_modules/`

因此标准布局

```
真包      ~/.dsh/profiles/web/dsh-token-usage/          # 持久、用户自有
链接 A    ~/.dsh/profiles/node_modules/dsh-token-usage  # -> ../web/dsh-token-usage
链接 B    <运行树>/node_modules/dsh-token-usage          # -> 真包绝对路径
```

真包放 profile 目录：升级 DSH 不丢源码；两条链接都是廉价的符号链接

## 开发

### 找契约的方法

不要猜 API，按此顺序取证

1. 包类型声明：`~/.dsh/profiles/node_modules/@deepseek-ai/<包>/lib/types/*.d.ts`
2. 编译产物：同包 `lib/*.js` 里的真实行为（类型只说形状，产物说语义）
3. 运行时 inspect（动态插件可用）：`cordis_inspect_list/query`，本会话模型通道对 oneOf 参数有序列化缺陷，静态开发以 1、2 为准

本插件用到的关键契约

- `sessionQuery.listSessions(): Promise<SessionRecord[]>`，record 含 `header`（id/createdAt/parentSession?/seedLength?）
- `sessionQuery.readSession(id): Promise<SessionLogSnapshot>`，`{ session, events }` 全量原始日志
- 事件：`assistant/message` 的 `data.usage`（TokenUsage：`inputTokens/outputTokens` 必有，`cacheReadTokens/cacheWriteTokens/reasoningTokens` 可选，reasoning 已含在 output 内）+ `data.message.source.{provider,model}` + 事件级 `time`（epoch ms）与 `seq`
- fork 去重：子会话日志物理包含 seed 事件，`seedLength > 0` 且父会话在语料内时跳过 `seq < seedLength`
- `webServer.register(route: WebRoute): () => void`，route 为 `{ kind: 'exact'|'prefix', path, handler(req,res) }`，handler 全权负责响应

### host 开发要点

- 聚合类服务做成「缓存 + 强制刷新」：本例 60 秒 TTL，`?refresh=1` 绕过；并发扫描用固定 worker 池（8），单会话失败计数不中断整体
- 输出保持 JSON-safe 扁平结构（`{in,cr,cw,out,reason,req}` 桶），不泄漏 Cordis 活对象
- 路由响应头带 `cache-control: no-store`，错误路径也返回 JSON

### client 开发要点

- 组件状态机三态（loading/error/ready）+ 空数据态，错误信息直接展示并给重试
- 图表用纯 div 堆叠（flex-grow 按 token 数加权），免引图表库
- 表格/卡片/按钮全部走 `--dsw-alias-*` 边框与背景 token，视觉与宿主一致
- 数据视图按页签拆分渲染，聚合结果一次取全，前端只切片

### 本地验证（三层，不启动 DSH）

1. host 逻辑：写 mock `ctx`（effect/webServer.register 打桩）+ mock `sessionQuery`（直接 `zstd -dc` 解析磁盘 `session.jsonl.zstd` 构造），调用 `apply` 后触发 handler，断言聚合结果
2. client 渲染：mock `window.__ModuleLoader__` 捕获注册项，fake `require('react')`，调用 `apply` 验证 slots 注册与 label；再用 `react-dom/server.renderToStaticMarkup` 分别 SSR 加载态与带数据态（fixture 替换初始 state）
3. patch 接入：用启动同款代码路径验证——`dsh-app-boot` 的 `loadOptionalPatches` + `composeEntries`，确认无警告且行正确生成

```
node --check lib/client.js && node --check lib/index.js   # 语法
```

> 会话日志在 `~/.dsh/sessions/<工作区目录>/session-<uuid>/session.jsonl.zstd`，是构造 mock 数据的最佳来源

## 维护

### 排障速查

| 症状 | 定位 |
| --- | --- |
| 启动报 `token-usage` 行未激活 | 两条符号链接目标是否存在；`inject` 的服务是否在当前组合挂载 |
| host 正常但设置页无条目 | 链接 A 失效（client 解析不到包）；浏览器硬刷新 |
| 条目出现但一直加载 | `/token-usage/stats` 返回 500，看 `error` 字段；多为 sessionQuery 读取失败 |
| 数据为空 | 确认有带 usage 的模型请求；检查 fork 去重是否误杀（seedLength 逻辑） |
| patch 改动不生效 | web 无配置 HMR，必须重启 |

### 升级

1. 覆盖 `~/.dsh/profiles/web/dsh-token-usage/` 下文件（或重跑 install.sh）
2. 重启 DSH

> client bundle 带 `?rev=<内容哈希>` 缓存戳，改 client.js 后浏览器自动取新，无需手动清缓存

### 回滚

- 临时下线：从 `cordis.patch.yml` 删掉该 insert 段，重启；包文件保留
- 完全卸载：删行 + 删两条链接 + 删包目录（uninstall.sh 一键，自动留 `cordis.patch.yml.bak-uninstall` 备份）

### 约定

- patch 文件改动前备份（`.bak-*` 后缀）
- 一个插件一个顶层 insert 段，注释写明用途与卸载方式，方便脚本化处理

## 部署

### 打包

```
dist/
├── dsh-token-usage/    # 插件包本体
├── install.sh
├── uninstall.sh
└── README.md
tar czf dsh-token-usage-dist.tar.gz dist/   # 权限先 chmod 755/644
```

### install.sh 的四步

1. 复制包到目标 `~/.dsh/profiles/web/dsh-token-usage/`
2. 建链接 A（profile 树）
3. 自动探测运行树建链接 B：优先 `command -v dsh` 反查 realpath 定位 `node_modules` 根，回退扫描 `~/.npm/_npx/*/node_modules/@deepseek-ai/dsh`；探测失败接受显式传参 `./install.sh <node_modules 根>`
4. 幂等追加 patch 行：空文件直接写、已有行跳过、其他条目保留追加；写入前若运行树内可达 js-yaml 则做 YAML 校验

### 目标机要求

- DSH 0.1.0-rc 系列且初始化过（存在 `~/.dsh/profiles/web/`）
- node 在 PATH（DSH 本身依赖）
- 安装后重启 DSH

### 已知限制

> `dsh` 经 npx 升级会重建缓存目录，链接 B 随之失效，启动时该行加载失败；重跑 install.sh 即修复。若发行方想彻底消除该耦合，需要上游支持以 profile 为基底的裸名解析（`bareModuleBaseUrl`）

### 兼容性声明

- 依赖契约：`sessionQuery.listSessions/readSession`、`webServer.register`、`settings.section` 槽位、`--dsw-*` token、ModuleLoader 包装格式
- 验证版本：DSH 0.1.0-rc.6；跨小版本升级后先跑本地验证三层再发布

## 附录：文件清单

| 路径 | 作用 |
| --- | --- |
| `~/.dsh/profiles/web/cordis.patch.yml` | 用户挂载层（本插件唯一配置入口） |
| `~/.dsh/profiles/web/dsh-token-usage/` | 插件真包 |
| `~/.dsh/profiles/node_modules/dsh-token-usage` | 链接 A，client 解析 |
| `<运行树>/node_modules/dsh-token-usage` | 链接 B，host 解析 |
| `~/.dsh/sessions/**/session.jsonl.zstd` | 数据源（只读） |
