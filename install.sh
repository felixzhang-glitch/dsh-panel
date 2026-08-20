#!/usr/bin/env bash
# dsh-panel unified installer
# Usage: ./install.sh [TARGET] [DSH_ROOT]
#   TARGET:   all (default) | dsh-token-usage | dsh-better-sidebar | <module under modules/>
#   DSH_ROOT: DSH runtime node_modules root (optional; auto-detected; not used by dsh-better-sidebar)
# Legacy usage './install.sh <DSH_ROOT>' still works (detected by path shape).
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME/profiles/web"

TARGET="${1:-all}"
DSH_ROOT_ARG="${2:-}"
# backward compat: first arg pointing at a DSH runtime tree is a DSH_ROOT
if [ -d "$TARGET/@deepseek-ai/dsh" ]; then
  DSH_ROOT_ARG="$TARGET"
  TARGET="dsh-token-usage"
fi

echo "==> checking prerequisites"
[ -d "$PROFILE_DIR" ] || { echo "ERROR: DSH web profile not found: $PROFILE_DIR (run 'dsh' at least once)" >&2; exit 1; }
command -v node >/dev/null || { echo "ERROR: node not found" >&2; exit 1; }

detect_runtime_root() {
  node -e '
    const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
    const probe = (p) => {
      const idx = p.indexOf("/node_modules/");
      return idx > 0 ? p.slice(0, idx + "/node_modules".length) : null;
    };
    const candidates = [];
    try {
      const bin = cp.execSync("command -v dsh", { shell: "/bin/bash", stdio: ["ignore","pipe","ignore"] }).toString().trim();
      if (bin) candidates.push(fs.realpathSync(bin));
    } catch {}
    try {
      for (const dir of fs.readdirSync(path.join(os.homedir(), ".npm/_npx"))) {
        const p = path.join(os.homedir(), ".npm/_npx", dir, "node_modules/@deepseek-ai/dsh/package.json");
        if (fs.existsSync(p)) candidates.push(p);
      }
    } catch {}
    for (const c of candidates) {
      const root = probe(c);
      if (root && fs.existsSync(path.join(root, "@deepseek-ai/dsh/package.json"))) { console.log(root); process.exit(0); }
    }
    process.exit(1);
  '
}

DSH_ROOT="$DSH_ROOT_ARG"
if [ "$TARGET" != "dsh-better-sidebar" ]; then
  if [ -z "$DSH_ROOT" ]; then
    echo "==> locating DSH runtime tree"
    DSH_ROOT=$(detect_runtime_root) || {
      echo "ERROR: cannot auto-detect the DSH runtime tree." >&2
      echo "Re-run with the node_modules root that contains @deepseek-ai/dsh, e.g.:" >&2
      echo "  ./install.sh all ~/.npm/_npx/<hash>/node_modules" >&2
      exit 1
    }
  fi
  [ -d "$DSH_ROOT/@deepseek-ai/dsh" ] || { echo "ERROR: $DSH_ROOT does not contain @deepseek-ai/dsh" >&2; exit 1; }
  echo "    runtime root: $DSH_ROOT"
fi

# install_pkg SRC PKG_NAME PLUGIN_ID
#   SRC: package source dir (package.json + lib/)
#   PKG_NAME: npm package name (also the mount row 'name')
#   PLUGIN_ID: cordis.patch.yml insert id
install_pkg() {
  local SRC="$1" PKG_NAME="$2" PLUGIN_ID="$3"
  echo
  echo "==> [$PKG_NAME] installing package to $PROFILE_DIR/$PKG_NAME"
  [ -f "$SRC/package.json" ] || { echo "ERROR: package.json not found under: $SRC" >&2; exit 1; }
  rm -rf "$PROFILE_DIR/$PKG_NAME"
  mkdir -p "$PROFILE_DIR/$PKG_NAME"
  cp "$SRC/package.json" "$PROFILE_DIR/$PKG_NAME/"
  cp -R "$SRC/lib" "$PROFILE_DIR/$PKG_NAME/lib"
  [ -f "$SRC/LICENSE" ] && cp "$SRC/LICENSE" "$PROFILE_DIR/$PKG_NAME/" || true

  echo "==> [$PKG_NAME] linking into profile module tree"
  mkdir -p "$DSH_HOME/profiles/node_modules"
  ln -sfn "../web/$PKG_NAME" "$DSH_HOME/profiles/node_modules/$PKG_NAME"
  ln -sfn "$PROFILE_DIR/$PKG_NAME" "$DSH_ROOT/$PKG_NAME"

  echo "==> [$PKG_NAME] mounting row in $PROFILE_DIR/cordis.patch.yml"
  node -e '
    const fs = require("fs"), path = require("path");
    const file = process.argv[1], root = process.argv[2], pkg = process.argv[3], id = process.argv[4];
    const ROW = [
      "# " + pkg + " plugin. Remove this entry to uninstall.",
      "- insert:",
      "    - id: " + id,
      "      name: \x27" + pkg + "\x27"
    ].join("\n");
    const idRe = new RegExp("^\\s*-?\\s*id:\\s*" + id + "\\s*$", "m");
    const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "[]";
    const stripped = text.replace(/#.*/g, "").trim();
    let out;
    if (stripped === "" || stripped === "[]") {
      out = ROW + "\n";
    } else if (idRe.test(text)) {
      console.log("    row already present, skipping");
      process.exit(0);
    } else {
      out = text.replace(/\s*$/, "") + "\n" + ROW + "\n";
    }
    if (stripped !== "" && stripped !== "[]") {
      // validate the result when js-yaml is reachable
      for (const cand of [path.join(root, "js-yaml"), path.join(root, "@deepseek-ai/dsh-app-boot/node_modules/js-yaml")]) {
        try {
          const yaml = require(cand);
          const jsExpr = new yaml.Type("tag:yaml.org,2002:js", { kind: "scalar", resolve: () => true, construct: (s) => s });
          yaml.load(out, { schema: yaml.JSON_SCHEMA.extend(jsExpr) });
          break;
        } catch (e) {
          if (e && e.code === "MODULE_NOT_FOUND") continue;
          console.error("ERROR: composed patch file failed YAML validation:\n" + (e && e.message));
          process.exit(1);
        }
      }
    }
    fs.writeFileSync(file, out);
    console.log("    patch file updated");
  ' "$PROFILE_DIR/cordis.patch.yml" "$DSH_ROOT" "$PKG_NAME" "$PLUGIN_ID"
}

# install_better_sidebar
#   Third-party module on the official bundle channel: `dsh plugin add`
#   installs the npm package into the profile and registers the bundle; no
#   symlinks, no manual patch row (a manual row would double-mount it).
install_better_sidebar() {
  local PKG="dsh-better-sidebar"
  local WS_YML="$PROFILE_DIR/pnpm-workspace.yaml"
  echo
  echo "==> [$PKG] installing via official bundle channel"
  [ -f "$WS_YML" ] || { echo "ERROR: $WS_YML not found (initialize the web profile first)" >&2; exit 1; }
  # allow node-pty build scripts; pnpm 11 strict-dep-builds otherwise aborts
  # the install before bundle reconciliation
  node -e '
    const fs = require("fs");
    const p = process.argv[1];
    let t = fs.readFileSync(p, "utf8");
    const before = t;
    t = t.replace(/^(\s*)node-pty:.*$/gm, "$1node-pty: true");
    if (!/^\s*allowBuilds:\s*$/m.test(t)) {
      t += "\nallowBuilds:\n  node-pty: true\n";
    } else if (!/^\s*node-pty:\s*true\s*$/m.test(t)) {
      t = t.replace(/^(\s*allowBuilds:\s*)$/m, "$1\n  node-pty: true");
    }
    if (t !== before) fs.writeFileSync(p, t);
  ' "$WS_YML"
  local CLI="dsh"
  command -v dsh >/dev/null || CLI="npx -y --package @deepseek-ai/dsh dsh"
  # resolve latest explicitly: an existing dependency spec in the profile would
  # otherwise shadow '@latest' and keep the old version
  local SPEC="latest"
  if command -v npm >/dev/null 2>&1; then
    SPEC="$(npm view "$PKG" version 2>/dev/null)" || SPEC="latest"
    [ -n "$SPEC" ] || SPEC="latest"
  fi
  echo "    spec: $PKG@$SPEC"
  $CLI plugin --profile web add "$PKG@$SPEC"
  node -e '
    const fs = require("fs");
    const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const bundles = (pkg.dsh && pkg.dsh.profile && pkg.dsh.profile.bundles) || [];
    if (!bundles.includes(process.argv[2])) process.exit(1);
  ' "$PROFILE_DIR/package.json" "$PKG" || { echo "ERROR: $PKG not registered in dsh.profile.bundles" >&2; exit 1; }
  echo "    bundle registered, mounted on next DSH start"
}

case "$TARGET" in
  all)
    install_pkg "$SCRIPT_DIR" "dsh-token-usage" "token-usage"
    for dir in "$SCRIPT_DIR"/modules/*/; do
      pkg=$(basename "$dir")
      [ -f "$dir/package.json" ] && [ -d "$dir/lib" ] || continue
      install_pkg "$dir" "$pkg" "${pkg#dsh-}"
    done
    install_better_sidebar
    ;;
  dsh-token-usage)
    install_pkg "$SCRIPT_DIR" "dsh-token-usage" "token-usage"
    ;;
  dsh-better-sidebar)
    install_better_sidebar
    ;;
  *)
    dir="$SCRIPT_DIR/modules/$TARGET"
    [ -f "$dir/package.json" ] || { echo "ERROR: unknown target '$TARGET' (expected: all | dsh-token-usage | dsh-better-sidebar | module under modules/)" >&2; exit 1; }
    install_pkg "$dir" "$TARGET" "${TARGET#dsh-}"
    ;;
esac

echo
echo "Done. Restart DSH ('dsh web' / your launcher) to load the changes."
