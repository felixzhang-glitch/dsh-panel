#!/usr/bin/env node
// dspm — dsh-panel 插件统一管理命令（macOS 自用）
// 单入口：list / install / uninstall / reload / add / update / pin / doctor
// 通道约定：
//   自有模块（仓库根包 + modules/*）→ 拷包 + 双符号链接 + cordis.patch.yml 挂载行
//   第三方（third-party.json 登记）→ bun 直装 + reconcileBundles 登记，不建链接、不写 patch 行

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import cp from 'node:child_process'
import { createRequire } from 'node:module'

const REPO_ROOT = path.dirname(new URL(import.meta.url).pathname) // dspm 位于仓库根
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const PROFILE_DIR = path.join(DSH_HOME, 'profiles', 'web')
const PROFILES_NM = path.join(DSH_HOME, 'profiles', 'node_modules')
const PATCH_FILE = path.join(PROFILE_DIR, 'cordis.patch.yml')
const PROFILE_PKG = path.join(PROFILE_DIR, 'package.json')
const WS_YML = path.join(PROFILE_DIR, 'pnpm-workspace.yaml')
const REGISTRY_FILE = path.join(REPO_ROOT, 'third-party.json')

let detectedRoot // lazy 缓存

// ---------- 小工具 ----------

function fail(msg) {
  console.error(`ERROR: ${msg}`)
  process.exit(1)
}

function step(msg) {
  console.log(`==> ${msg}`)
}

function hasCmd(name) {
  try {
    cp.execSync(`command -v ${name}`, { shell: '/bin/bash', stdio: ['ignore', 'pipe', 'ignore'] })
    return true
  } catch {
    return false
  }
}

function sh(cmd, opts = {}) {
  return cp.execSync(cmd, { shell: '/bin/bash', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).toString()
}

function shInherit(cmd, opts = {}) {
  cp.execSync(cmd, { shell: '/bin/bash', stdio: 'inherit', ...opts })
}

function safeReaddir(dir) {
  try {
    return fs.readdirSync(dir)
  } catch {
    return []
  }
}

// ---------- 模块发现 ----------

// 自有模块 = 仓库根包 + modules/*，零配置自动发现
function ownModules() {
  const mods = []
  const rootPkgPath = path.join(REPO_ROOT, 'package.json')
  if (fs.existsSync(rootPkgPath)) {
    const p = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'))
    mods.push({ name: p.name, version: p.version || '?', kind: 'own', src: REPO_ROOT, hasClient: !!p.dsh?.client })
  }
  for (const d of safeReaddir(path.join(REPO_ROOT, 'modules')).sort()) {
    const pj = path.join(REPO_ROOT, 'modules', d, 'package.json')
    if (!fs.existsSync(pj)) continue
    const p = JSON.parse(fs.readFileSync(pj, 'utf8'))
    mods.push({ name: p.name || d, version: p.version || '?', kind: 'own', src: path.join(REPO_ROOT, 'modules', d), hasClient: !!p.dsh?.client })
  }
  return mods
}

function readRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
  } catch {
    return []
  }
}

function writeRegistry(list) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(list, null, 2) + '\n')
}

// 第三方模块 = registry 登记项，统一走 bundle 通道
function thirdPartyModules() {
  return readRegistry().map((e) => ({ ...e, version: e.spec || '?', kind: 'bundle' }))
}

function allModules() {
  return [...ownModules(), ...thirdPartyModules()]
}

function pluginId(name) {
  return name.replace(/^dsh-/, '')
}

function resolveTargets(target) {
  const all = allModules()
  if (!target || target === 'all') return all
  const m = all.find((x) => x.name === target || x.name === `dsh-${target}`)
  if (!m) fail(`unknown target '${target}' (known: ${all.map((x) => x.name).join(', ')})`)
  return [m]
}

// ---------- DSH 运行树探测 ----------

function probeRoot(p) {
  const idx = p.indexOf('/node_modules/')
  if (idx < 0) return null
  const root = p.slice(0, idx + '/node_modules'.length)
  return fs.existsSync(path.join(root, '@deepseek-ai/dsh/package.json')) ? root : null
}

function detectRuntimeRoot() {
  if (detectedRoot !== undefined) return detectedRoot
  const candidates = []
  // 1. 正在运行的 dsh web 进程（最准）
  try {
    const out = sh("ps -axo command= | grep -F 'node_modules/.bin/dsh web' || true")
    for (const line of out.split('\n')) {
      const t = line.trim()
      if (t) candidates.push(t.split(/\s+/)[1])
    }
  } catch {}
  // 2. PATH 中的 dsh
  try {
    const bin = sh('command -v dsh').trim()
    if (bin) candidates.push(fs.realpathSync(bin))
  } catch {}
  // 3. bunx 临时缓存 $TMPDIR/bunx-*/**/node_modules
  try {
    const tmp = os.tmpdir()
    for (const d of safeReaddir(tmp)) {
      if (!d.startsWith('bunx-')) continue
      for (const sub of safeReaddir(path.join(tmp, d))) {
        candidates.push(path.join(tmp, d, sub, 'node_modules', '@deepseek-ai/dsh', 'package.json'))
      }
    }
  } catch {}
  // 4. npx 缓存 ~/.npm/_npx
  try {
    const npxDir = path.join(os.homedir(), '.npm', '_npx')
    for (const d of safeReaddir(npxDir)) {
      candidates.push(path.join(npxDir, d, 'node_modules', '@deepseek-ai/dsh', 'package.json'))
    }
  } catch {}
  for (const c of candidates) {
    const root = probeRoot(c)
    if (root) {
      detectedRoot = root
      return root
    }
  }
  detectedRoot = null
  return null
}

function requireRuntimeRoot(flags) {
  if (flags.dshRoot) {
    if (!fs.existsSync(path.join(flags.dshRoot, '@deepseek-ai/dsh'))) {
      fail(`${flags.dshRoot} does not contain @deepseek-ai/dsh`)
    }
    return flags.dshRoot
  }
  const root = detectRuntimeRoot()
  if (!root) {
    fail('cannot auto-detect the DSH runtime tree; re-run with --dsh-root <node_modules root containing @deepseek-ai/dsh>')
  }
  return root
}

// ---------- patch 行 ----------

function patchHasRow(id) {
  if (!fs.existsSync(PATCH_FILE)) return false
  return new RegExp('^\\s*-?\\s*id:\\s*' + id + '\\s*$', 'm').test(fs.readFileSync(PATCH_FILE, 'utf8'))
}

function validatePatchYaml(text, root) {
  const cands = [path.join(root, 'js-yaml'), path.join(root, '@deepseek-ai/dsh-app-boot/node_modules/js-yaml')]
  const req = createRequire(path.join(root, '@deepseek-ai/dsh', 'package.json'))
  for (const cand of cands) {
    try {
      const yaml = req(cand)
      const jsExpr = new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', resolve: () => true, construct: (s) => s })
      yaml.load(text, { schema: yaml.JSON_SCHEMA.extend(jsExpr) })
      return
    } catch (e) {
      if (e && e.code === 'MODULE_NOT_FOUND') continue
      fail('composed patch file failed YAML validation:\n' + (e && e.message))
    }
  }
}

function ensurePatchRow(pkg, id, root) {
  const ROW = [
    `# ${pkg} plugin. Remove this entry to uninstall.`,
    '- insert:',
    `    - id: ${id}`,
    `      name: '${pkg}'`,
  ].join('\n')
  const text = fs.existsSync(PATCH_FILE) ? fs.readFileSync(PATCH_FILE, 'utf8') : '[]'
  const stripped = text.replace(/#.*/g, '').trim()
  const idRe = new RegExp('^\\s*-?\\s*id:\\s*' + id + '\\s*$', 'm')
  let out
  if (stripped === '' || stripped === '[]') {
    out = ROW + '\n'
  } else if (idRe.test(text)) {
    console.log('    row already present, skipping')
    return
  } else {
    out = text.replace(/\s*$/, '') + '\n' + ROW + '\n'
    validatePatchYaml(out, root)
  }
  fs.writeFileSync(PATCH_FILE, out)
  console.log('    patch file updated')
}

function removePatchRow(id) {
  if (!fs.existsSync(PATCH_FILE)) return
  fs.copyFileSync(PATCH_FILE, PATCH_FILE + '.bak-uninstall')
  const text = fs.readFileSync(PATCH_FILE, 'utf8')
  const lines = text.split('\n')
  // 按顶层 "- " 列表项分组（连同其前置注释/空行），删除 body 含该 id 的组
  const groups = []
  let pendingComments = []
  let current = null
  const flush = () => {
    if (current) {
      groups.push(current)
      current = null
    }
  }
  for (const line of lines) {
    if (/^- /.test(line)) {
      flush()
      current = { comments: pendingComments, body: [line] }
      pendingComments = []
    } else if (/^\s*$/.test(line) || /^#/.test(line)) {
      flush()
      pendingComments.push(line)
    } else if (current) {
      current.body.push(line)
    } else {
      pendingComments.push(line)
    }
  }
  flush()
  const kept = []
  let removed = false
  for (const g of groups) {
    if (g.body.join('\n').includes(id)) {
      removed = true
      kept.push(...g.comments.filter((c) => !c.includes(id)))
      continue
    }
    kept.push(...g.comments, ...g.body)
  }
  let out = [...pendingComments, ...kept].join('\n')
  out = out.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '')
  if (out.replace(/#.*/g, '').trim() === '') out = '[]\n'
  if (!out.endsWith('\n')) out += '\n'
  fs.writeFileSync(PATCH_FILE, out)
  console.log(removed ? `    row removed (backup: ${PATCH_FILE}.bak-uninstall)` : '    row not found')
}

// Node 16 rmSync 对目录不带 recursive 会抛 EISDIR；符号链接删除只摘链接不伤目标
// 真实目录仅在 allowRealDir（自有 dest 包目录）时允许递归删，防沿旧链接误删外部目录
function removeEntry(p, { allowRealDir = false } = {}) {
  let st
  try { st = fs.lstatSync(p) } catch { return }
  if (st.isSymbolicLink()) return fs.rmSync(p, { recursive: true, force: true }) // Node 16 非 recursive 会跟随链接到目录抛 EISDIR；recursive 只摘链接
  if (!allowRealDir) fail(`unexpected real directory, refusing to remove: ${p}`)
  fs.rmSync(p, { recursive: true, force: true })
}

// ---------- 自有模块通道 ----------

function installOwn(mod, root) {
  step(`[${mod.name}] installing package to ${PROFILE_DIR}/${mod.name}`)
  if (!fs.existsSync(path.join(mod.src, 'package.json'))) fail(`package.json not found under: ${mod.src}`)
  const dest = path.join(PROFILE_DIR, mod.name)
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  fs.copyFileSync(path.join(mod.src, 'package.json'), path.join(dest, 'package.json'))
  fs.cpSync(path.join(mod.src, 'lib'), path.join(dest, 'lib'), { recursive: true })
  if (fs.existsSync(path.join(mod.src, 'LICENSE'))) {
    fs.copyFileSync(path.join(mod.src, 'LICENSE'), path.join(dest, 'LICENSE'))
  }

  step(`[${mod.name}] linking into profile module tree`)
  fs.mkdirSync(PROFILES_NM, { recursive: true })
  const linkA = path.join(PROFILES_NM, mod.name)
  removeEntry(linkA)
  fs.symlinkSync(path.relative(PROFILES_NM, dest), linkA)
  const linkB = path.join(root, mod.name)
  removeEntry(linkB)
  fs.symlinkSync(dest, linkB)

  step(`[${mod.name}] mounting row in ${PATCH_FILE}`)
  ensurePatchRow(mod.name, pluginId(mod.name), root)
}

function uninstallOwn(mod, flags = {}) {
  step(`[${mod.name}] removing mount row from ${PATCH_FILE}`)
  removePatchRow(pluginId(mod.name))
  step(`[${mod.name}] removing links and package dir`)
  removeEntry(path.join(PROFILES_NM, mod.name))
  const root = flags.dshRoot || detectRuntimeRoot()
  if (root) {
    removeEntry(path.join(root, mod.name))
    console.log(`    removed ${path.join(root, mod.name)}`)
  } else {
    console.log('    runtime tree not detected, runtime link (if any) left in place')
  }
  fs.rmSync(path.join(PROFILE_DIR, mod.name), { recursive: true, force: true })
}

// ---------- bundle 通道（第三方：bun 直装 + 手动 reconcile） ----------

// 非交互 shell 的 PATH 可能缺 ~/.bun/bin，按安装路径兜底解析
function bunCli() {
  for (const c of [
    process.env.BUN_INSTALL && path.join(process.env.BUN_INSTALL, 'bin', 'bun'),
    path.join(os.homedir(), '.bun', 'bin', 'bun'),
  ]) {
    if (c && fs.existsSync(c)) return c
  }
  if (hasCmd('bun')) return 'bun'
  fail('bun not found (install: curl -fsSL https://bun.sh/install | bash)')
}

function npmViewVersion(spec) {
  try {
    return sh(`npm view ${JSON.stringify(spec)} version 2>/dev/null`).trim().split('\n').pop() || null
  } catch {
    return null
  }
}

// pnpm 11 strict-dep-builds 会在 bundle 协调前中止安装，幂等放行 node-pty 构建
// （pnpm-workspace.yaml 留给官方 dsh plugin 通道兜底；bun 通道见 ensureTrustedDeps）
function ensureAllowBuilds() {
  if (!fs.existsSync(WS_YML)) fail(`${WS_YML} not found (initialize the web profile first)`)
  const before = fs.readFileSync(WS_YML, 'utf8')
  let t = before.replace(/^(\s*)node-pty:.*$/gm, '$1node-pty: true')
  if (!/^\s*allowBuilds:\s*$/m.test(t)) {
    t += '\nallowBuilds:\n  node-pty: true\n'
  } else if (!/^\s*node-pty:\s*true\s*$/m.test(t)) {
    t = t.replace(/^(\s*allowBuilds:\s*)$/m, '$1\n  node-pty: true')
  }
  if (t !== before) fs.writeFileSync(WS_YML, t)
}

// bun 以 profile package.json 的 trustedDependencies 放行 lifecycle 脚本，幂等放行 node-pty 原生构建
function ensureTrustedDeps() {
  if (!fs.existsSync(PROFILE_PKG)) fail(`${PROFILE_PKG} not found (initialize the web profile first)`)
  const pkg = JSON.parse(fs.readFileSync(PROFILE_PKG, 'utf8'))
  const td = pkg.trustedDependencies || []
  if (td.includes('node-pty')) return
  pkg.trustedDependencies = [...td, 'node-pty']
  fs.writeFileSync(PROFILE_PKG, JSON.stringify(pkg, null, 2) + '\n')
}

// bun 强制自动安装 peer（含 peer 的 peer）且无开关：装完剪除，否则与宿主双实例必炸
// （官方通道靠 autoInstallPeers:false 防；剪后与官方通道的 profile 树状态一致）
function prunePeers(name) {
  const nm = path.join(PROFILE_DIR, 'node_modules')
  const manifest = path.join(nm, name, 'package.json')
  if (fs.existsSync(manifest)) {
    for (const p of Object.keys(JSON.parse(fs.readFileSync(manifest, 'utf8')).peerDependencies || {})) {
      fs.rmSync(path.join(nm, p), { recursive: true, force: true })
      console.log(`    pruned peer: ${p}`)
    }
  }
  // @deepseek-ai/* 一律由宿主运行树提供，残留的传递 peer 全部剪除（保留空 scope 目录）
  for (const e of safeReaddir(path.join(nm, '@deepseek-ai'))) {
    fs.rmSync(path.join(nm, '@deepseek-ai', e), { recursive: true, force: true })
    console.log(`    pruned host package: @deepseek-ai/${e}`)
  }
}

// bun 解包会丢失文件可执行位：node-pty 的 spawn-helper 丢了 +x 终端功能必炸，精准补回
function fixExecBits() {
  const dir = path.join(PROFILE_DIR, 'node_modules', 'node-pty', 'prebuilds')
  if (!fs.existsSync(dir)) return
  const walk = (d) => {
    for (const e of safeReaddir(d)) {
      const f = path.join(d, e)
      if (fs.statSync(f).isDirectory()) walk(f)
      else if (e.startsWith('spawn-helper') && !(fs.statSync(f).mode & 0o111)) {
        fs.chmodSync(f, 0o755)
        console.log(`    restored exec bit: ${path.relative(PROFILE_DIR, f)}`)
      }
    }
  }
  walk(dir)
}

// dsh.profile.bundles 登记：原来由 dsh CLI 的 reconcilePlugins 完成，迁移后 dspm 自己做
// add：已装包声明 dsh.bundle.patch 才登记（去重）；remove：摘除
function reconcileBundles(name, action) {
  const pkg = JSON.parse(fs.readFileSync(PROFILE_PKG, 'utf8'))
  const bundles = pkg.dsh?.profile?.bundles || []
  if (action === 'add') {
    const manifest = path.join(PROFILE_DIR, 'node_modules', name, 'package.json')
    const declares = fs.existsSync(manifest) && JSON.parse(fs.readFileSync(manifest, 'utf8')).dsh?.bundle?.patch !== undefined
    if (!declares) fail(`${name} declares no dsh.bundle.patch — not a profile bundle`)
    if (!bundles.includes(name)) bundles.push(name)
  } else {
    const i = bundles.indexOf(name)
    if (i >= 0) bundles.splice(i, 1)
  }
  pkg.dsh = { ...pkg.dsh, profile: { ...pkg.dsh?.profile, bundles } }
  fs.writeFileSync(PROFILE_PKG, JSON.stringify(pkg, null, 2) + '\n')
}

function installBundle(mod) {
  step(`[${mod.name}] installing via bun bundle channel`)
  ensureAllowBuilds()
  ensureTrustedDeps()
  // 显式解析版本：profile 既有依赖声明会遮蔽 @latest
  let spec = mod.spec
  if (!spec || spec === 'latest') spec = npmViewVersion(mod.name) || 'latest'
  console.log(`    spec: ${mod.name}@${spec}`)
  // npm_config_disturl：node-pty 的 node-gyp 拉 headers 走国内镜像（卡顿大头）
  shInherit(`${bunCli()} add ${JSON.stringify(`${mod.name}@${spec}`)}`, {
    cwd: PROFILE_DIR,
    env: { ...process.env, npm_config_disturl: 'https://npmmirror.com/mirrors/node' },
  })
  prunePeers(mod.name)
  fixExecBits()
  reconcileBundles(mod.name, 'add')
  const pkg = JSON.parse(fs.readFileSync(PROFILE_PKG, 'utf8'))
  const bundles = pkg.dsh?.profile?.bundles || []
  if (!bundles.includes(mod.name)) fail(`${mod.name} not registered in dsh.profile.bundles`)
  console.log('    bundle registered, mounted on next DSH start')
}

function uninstallBundle(mod) {
  step(`[${mod.name}] removing via bun`)
  shInherit(`${bunCli()} remove ${JSON.stringify(mod.name)}`, { cwd: PROFILE_DIR })
  reconcileBundles(mod.name, 'remove')
  prunePeers(mod.name)
}

// ---------- 状态与体检 ----------

// 返回 'ok' | 'broken' | 'missing'
function linkState(link, dest) {
  let st
  try {
    st = fs.lstatSync(link)
  } catch {
    return 'missing'
  }
  if (!st.isSymbolicLink()) return 'missing'
  try {
    return fs.realpathSync(link) === fs.realpathSync(dest) ? 'ok' : 'broken'
  } catch {
    return 'broken'
  }
}

function ownStatus(mod) {
  const dest = path.join(PROFILE_DIR, mod.name)
  const files = fs.existsSync(path.join(dest, 'package.json'))
  if (!files) return { installed: false }
  const linkA = linkState(path.join(PROFILES_NM, mod.name), dest)
  const root = detectRuntimeRoot()
  const linkB = root ? linkState(path.join(root, mod.name), dest) : 'unknown'
  const patch = patchHasRow(pluginId(mod.name))
  const ok = linkA === 'ok' && patch && (linkB === 'ok' || linkB === 'unknown')
  const parts = []
  if (linkA !== 'ok') parts.push(`链接A ${linkA}`)
  if (linkB !== 'ok' && linkB !== 'unknown') parts.push(`链接B ${linkB}`)
  if (linkB === 'unknown') parts.push('链接B 未探测(运行树未知)')
  if (!patch) parts.push('patch 行缺失')
  return { installed: true, ok, detail: ok ? 'ok' : parts.join('；') }
}

function profilePkg() {
  try {
    return JSON.parse(fs.readFileSync(PROFILE_PKG, 'utf8'))
  } catch {
    return {}
  }
}

function bundleStatus(mod) {
  const pkg = profilePkg()
  const bundles = pkg.dsh?.profile?.bundles || []
  const depSpec = pkg.dependencies?.[mod.name]
  const registered = bundles.includes(mod.name)
  if (!registered && !depSpec) return { installed: false }
  const parts = []
  if (!registered) parts.push('bundle 未登记')
  if (!depSpec) parts.push('依赖缺失')
  if (depSpec && mod.spec && depSpec.replace(/^[~^]/, '') !== mod.spec) parts.push(`版本错配(装 ${depSpec} / pin ${mod.spec})`)
  return { installed: true, ok: parts.length === 0, detail: parts.length ? parts.join('；') : `ok（依赖声明 ${depSpec}）` }
}

function statusOf(mod) {
  return mod.kind === 'own' ? ownStatus(mod) : bundleStatus(mod)
}

// ---------- DSH 进程 ----------

function findDshWebPids() {
  let out
  try {
    out = sh('ps -axo pid=,command=')
  } catch {
    return []
  }
  const pids = []
  for (const line of out.split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(.*)$/)
    if (!m) continue
    const pid = +m[1]
    const cmd = m[2]
    if (pid === process.pid || pid === process.ppid) continue
    if (/\.bin\/dsh\s+web(\s|$)/.test(cmd) || /(^|[\s/])dsh(@\S+)?\s+web(\s|$)/.test(cmd)) pids.push(pid)
  }
  return pids
}

function restartDsh(flags) {
  if (!flags.yes) fail('重启将断开当前所有 DSH 会话（包括本对话）；确认请加 --yes')
  step('stopping dsh web')
  const pids = findDshWebPids()
  if (!pids.length) console.log('    no running dsh web process found')
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM')
      console.log(`    SIGTERM -> ${pid}`)
    } catch {}
  }
  const deadline = Date.now() + 5000
  while (Date.now() < deadline && findDshWebPids().length) {
    cp.execSync('sleep 0.5')
  }
  if (findDshWebPids().length) console.log('    WARN: process still alive after SIGTERM')
  if (flags.noStart) {
    console.log('    --no-start given, not relaunching')
    return
  }
  step('starting dsh web (bunx @deepseek-ai/dsh@latest)')
  const [bin, args] = hasCmd('bunx')
    ? ['bunx', ['@deepseek-ai/dsh@latest', 'web']]
    : ['npx', ['-y', '@deepseek-ai/dsh', 'web']]
  const logFile = path.join(DSH_HOME, 'dspm-restart.log')
  const logFd = fs.openSync(logFile, 'a')
  const child = cp.spawn(bin, args, { detached: true, stdio: ['ignore', logFd, logFd] })
  child.unref()
  console.log(`    started, pid ${child.pid}; log: ${logFile}`)
}

// ---------- 命令 ----------

const HELP = {
  usage: `dspm — dsh-panel 插件统一管理命令（macOS）

用法: dspm <command> [target] [options]

命令:
  list | ls                 列出全部模块及安装状态
  install <target|all>      安装模块（幂等，断链重跑即修复）
  uninstall <target|all>    卸载模块（别名 rm）
  reload <target|all>       重同步模块文件；自有模块重拷，第三方按 pin 版本重装
  add <pkg>[@version]       纳管第三方 npm 插件：登记 third-party.json 并经 bun 通道安装
  update [target|all]       升级第三方模块到 npm 最新版并更新 pin
  pin <pkg> <version>       锁定第三方模块版本并重装
  doctor                    体检：断链 / patch 行缺失 / bundle 未登记 / 版本错配 / 备份残留

参数:
  target                    模块名（dsh-token-usage、modules/ 下模块、registry 第三方；可省 dsh- 前缀）

选项:
  --dsh-root <path>         手动指定 DSH 运行树 node_modules 根（默认自动探测）
  --restart                 reload 后重启 DSH（需配合 --yes；会断开当前所有会话）
  --no-start                配合 --restart：只停止，不自动拉起
  --prune-backups           配合 uninstall：清理 profile 里的 .bak-* 备份残留；不传 target 时仅清理不卸载
  --note "<text>"           配合 add：写入 registry 备注
  --yes                     确认危险操作
  -h, --help                显示帮助（dspm <command> -h 看单命令用法）

示例:
  dspm list
  dspm install all
  dspm reload dsh-token-usage --restart --yes
  dspm add dsh-xxx@1.2.0 --note "某个好用的插件"`,
  list: 'dspm list\n  列出全部模块（自有 + 第三方 registry）及安装状态',
  install: 'dspm install <target|all> [--dsh-root <path>]\n  安装模块；幂等，断链/缺行重跑即修复；默认 all',
  uninstall: 'dspm uninstall <target|all> [--prune-backups]\n  卸载模块；自有模块移除 patch 行（留 .bak-uninstall 备份）+ 链接 + 包目录，第三方走 bun remove\n  --prune-backups 不传 target 时仅清理 .bak-* 备份，不卸载',
  reload: 'dspm reload <target|all> [--restart] [--no-start] [--yes]\n  重同步模块文件（自有重拷 / 第三方按 pin 重装）\n  web 无 HMR：client 改动浏览器硬刷新生效，host 改动需 --restart --yes 重启',
  add: 'dspm add <pkg>[@version] [--note "<text>"]\n  纳管第三方 npm 插件：校验存在性 → 登记 third-party.json（pin 版本）→ bun 通道安装（装后剪除 peer 防双实例）',
  update: 'dspm update [target|all]\n  对第三方模块 npm view 最新版，与 pin 不同则更新 registry 并重装；默认全部第三方',
  pin: 'dspm pin <pkg> <version>\n  锁定 registry 中第三方模块的版本并重装',
  doctor: 'dspm doctor\n  全量体检并给出修复建议；有问题时退出码为 1',
}

// CJK 字符按 2 列宽对齐
function dw(s) {
  return [...String(s)].reduce((n, c) => n + (c.codePointAt(0) > 0xff ? 2 : 1), 0)
}

function pad(s, n) {
  return String(s) + ' '.repeat(Math.max(0, n - dw(s)))
}

function cmdList() {
  const rows = allModules().map((m) => {
    const s = statusOf(m)
    return [m.name, m.kind === 'own' ? '自有' : '第三方', m.version, s.installed ? s.detail : '未安装']
  })
  const head = ['模块', '来源', '版本', '状态']
  const widths = [dw(head[0]), dw(head[1]), dw(head[2])]
  for (const r of rows) {
    widths[0] = Math.max(widths[0], dw(r[0]))
    widths[1] = Math.max(widths[1], dw(r[1]))
    widths[2] = Math.max(widths[2], dw(r[2]))
  }
  console.log([pad(head[0], widths[0]), pad(head[1], widths[1]), pad(head[2], widths[2]), head[3]].join('  '))
  for (const r of rows) {
    console.log([pad(r[0], widths[0]), pad(r[1], widths[1]), pad(r[2], widths[2]), r[3]].join('  '))
  }
  const root = detectRuntimeRoot()
  console.log(`\nruntime root: ${root || '(未探测到，链接B 状态未知)'}`)
  console.log(`profile:      ${PROFILE_DIR}`)
}

function cmdInstall(args, flags) {
  step('checking prerequisites')
  if (!fs.existsSync(PROFILE_DIR)) fail(`DSH web profile not found: ${PROFILE_DIR} (run 'dsh' at least once)`)
  const targets = resolveTargets(args[0] || 'all')
  let root
  if (targets.some((m) => m.kind === 'own')) {
    root = requireRuntimeRoot(flags)
    console.log(`    runtime root: ${root}`)
  }
  for (const m of targets) {
    if (m.kind === 'own') installOwn(m, root)
    else installBundle(m)
  }
  console.log("\nDone. Restart DSH ('dsh web' / your launcher) to load the changes.")
}

function cmdUninstall(args, flags) {
  // 安全阀：--prune-backups 不传 target 时只清理备份，不卸载任何模块
  const onlyPrune = flags.pruneBackups && !args[0]
  if (!onlyPrune) {
    const targets = resolveTargets(args[0] || 'all')
    for (const m of targets) {
      if (m.kind === 'own') uninstallOwn(m, flags)
      else uninstallBundle(m)
    }
  }
  if (flags.pruneBackups) {
    const baks = safeReaddir(PROFILE_DIR).filter((f) => f.includes('.bak'))
    for (const b of baks) fs.rmSync(path.join(PROFILE_DIR, b), { recursive: true, force: true })
    console.log(baks.length ? `==> pruned ${baks.length} backup file(s): ${baks.join(', ')}` : '==> no backup files to prune')
  }
  if (!onlyPrune) console.log('\nDone. Restart DSH to finish removal.')
}

function cmdReload(args, flags) {
  const targets = resolveTargets(args[0] || 'all')
  let root
  if (targets.some((m) => m.kind === 'own')) root = requireRuntimeRoot(flags)
  for (const m of targets) {
    if (m.kind === 'own') {
      installOwn(m, root)
      console.log(
        m.hasClient
          ? `    [${m.name}] client 改动浏览器硬刷新生效；host 改动需重启（--restart --yes）`
          : `    [${m.name}] host-only 模块，改动需重启 DSH 生效（--restart --yes）`
      )
    } else {
      installBundle(m)
      console.log(`    [${m.name}] bundle 已按 pin 重装，需重启 DSH 生效`)
    }
  }
  if (flags.restart) restartDsh(flags)
  else console.log('\n未重启 DSH。需要生效时：dspm reload <target> --restart --yes')
}

function cmdAdd(args, flags) {
  const raw = args[0] || fail('usage: dspm add <pkg>[@version] [--note "<text>"]')
  // 兼容 scope 包名：最后一个 @ 且不在首位才是版本分隔
  const at = raw.lastIndexOf('@')
  const name = at > 0 ? raw.slice(0, at) : raw
  const givenVer = at > 0 ? raw.slice(at + 1) : null
  const registry = readRegistry()
  if (registry.some((e) => e.name === name)) fail(`${name} 已在 registry 中；升版本用 dspm update，锁版本用 dspm pin`)
  const resolved = npmViewVersion(givenVer ? `${name}@${givenVer}` : name)
  if (!resolved) fail(`npm 上未解析到 ${givenVer ? `${name}@${givenVer}` : name}（包不存在或未联网）`)
  const entry = { name, spec: resolved, channel: 'bundle' }
  if (flags.note) entry.note = flags.note
  registry.push(entry)
  writeRegistry(registry)
  console.log(`==> [${name}] registered in third-party.json @ ${resolved}`)
  installBundle({ ...entry, kind: 'bundle' })
}

function cmdUpdate(args, flags) {
  const targets = resolveTargets(args[0] || 'all').filter((m) => m.kind === 'bundle')
  if (!targets.length) {
    console.log('无第三方模块')
    return
  }
  const registry = readRegistry()
  for (const m of targets) {
    const latest = npmViewVersion(m.name)
    if (!latest) fail(`npm view ${m.name} 失败（未联网？）`)
    if (latest === m.spec) {
      console.log(`==> [${m.name}] already latest (${m.spec})`)
      continue
    }
    console.log(`==> [${m.name}] ${m.spec} -> ${latest}`)
    const entry = registry.find((e) => e.name === m.name)
    entry.spec = latest
    writeRegistry(registry)
    installBundle({ ...entry, kind: 'bundle' })
  }
}

function cmdPin(args) {
  const [name, version] = args
  if (!name || !version) fail('usage: dspm pin <pkg> <version>')
  const registry = readRegistry()
  const entry = registry.find((e) => e.name === name || e.name === `dsh-${name}`)
  if (!entry) fail(`${name} 不在 registry 中；先 dspm add ${name}@${version}`)
  entry.spec = version
  writeRegistry(registry)
  console.log(`==> [${entry.name}] pinned @ ${version}`)
  installBundle({ ...entry, kind: 'bundle' })
}

function cmdDoctor() {
  const issues = []
  for (const m of ownModules()) {
    const s = ownStatus(m)
    if (!s.installed) {
      console.log(`-- [${m.name}] 未安装（dspm install ${m.name}）`)
      continue
    }
    if (s.ok) {
      console.log(`ok [${m.name}]`)
      continue
    }
    issues.push(`[${m.name}] ${s.detail} → 修复: dspm install ${m.name}`)
  }
  const pkg = profilePkg()
  const bundles = pkg.dsh?.profile?.bundles || []
  for (const m of thirdPartyModules()) {
    const s = bundleStatus(m)
    if (!s.installed) {
      issues.push(`[${m.name}] registry 已登记但未安装 → 修复: dspm install ${m.name}`)
      continue
    }
    if (s.ok) {
      console.log(`ok [${m.name}]（${pkg.dependencies?.[m.name]}）`)
      continue
    }
    issues.push(`[${m.name}] ${s.detail} → 修复: dspm reload ${m.name} 或 dspm pin ${m.name} <version>`)
  }
  const baks = safeReaddir(PROFILE_DIR).filter((f) => f.includes('.bak'))
  if (baks.length) issues.push(`profile 备份残留 ${baks.length} 个（${baks.join(', ')}）→ 清理: dspm uninstall --prune-backups`)
  if (!detectRuntimeRoot()) issues.push('未探测到 DSH 运行树，链接B 状态未知 → dspm install all --dsh-root <path>')
  console.log('')
  if (!issues.length) {
    console.log('doctor: all good')
    return
  }
  for (const i of issues) console.log(`ISSUE ${i}`)
  console.log(`\ndoctor: ${issues.length} issue(s)`)
  process.exit(1)
}

// ---------- 入口 ----------

function main() {
  const argv = process.argv.slice(2)
  const flags = {}
  const args = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '-h' || a === '--help') flags.help = true
    else if (a === '--dsh-root') flags.dshRoot = argv[++i]
    else if (a === '--restart') flags.restart = true
    else if (a === '--no-start') flags.noStart = true
    else if (a === '--prune-backups') flags.pruneBackups = true
    else if (a === '--yes') flags.yes = true
    else if (a === '--note') flags.note = argv[++i]
    else if (a.startsWith('-')) fail(`unknown option '${a}' (see dspm -h)`)
    else args.push(a)
  }
  const command = args.shift()

  if (!command || flags.help) {
    if (command && HELP[command]) console.log(HELP[command])
    else console.log(HELP.usage)
    process.exit(command && !flags.help ? 1 : 0)
  }

  switch (command) {
    case 'list':
    case 'ls':
      cmdList()
      break
    case 'install':
      cmdInstall(args, flags)
      break
    case 'uninstall':
    case 'rm':
      cmdUninstall(args, flags)
      break
    case 'reload':
      cmdReload(args, flags)
      break
    case 'add':
      cmdAdd(args, flags)
      break
    case 'update':
      cmdUpdate(args, flags)
      break
    case 'pin':
      cmdPin(args)
      break
    case 'doctor':
      cmdDoctor()
      break
    default:
      fail(`unknown command '${command}' (see dspm -h)`)
  }
}

main()
