#!/usr/bin/env bash
# dsh-token-usage installer
# Usage: ./install.sh [DSH_ROOT]
#   DSH_ROOT: DSH runtime node_modules root (optional; auto-detected)
set -euo pipefail

PKG_NAME="dsh-token-usage"
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
# Package source: repository layout when package.json sits beside this script,
# tarball layout when the package lives in ./dsh-token-usage/.
if [ -f "$SCRIPT_DIR/package.json" ] && [ -d "$SCRIPT_DIR/lib" ]; then
  SRC="$SCRIPT_DIR"
elif [ -d "$SCRIPT_DIR/$PKG_NAME" ]; then
  SRC="$SCRIPT_DIR/$PKG_NAME"
else
  echo "ERROR: package not found (expected package.json beside the script or in ./$PKG_NAME)" >&2
  exit 1
fi

DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME/profiles/web"

echo "==> checking prerequisites"
[ -f "$SRC/package.json" ] || { echo "ERROR: package.json not found under: $SRC" >&2; exit 1; }
[ -d "$PROFILE_DIR" ] || { echo "ERROR: DSH web profile not found: $PROFILE_DIR (run 'dsh' at least once)" >&2; exit 1; }
command -v node >/dev/null || { echo "ERROR: node not found" >&2; exit 1; }

echo "==> installing package to $PROFILE_DIR/$PKG_NAME"
rm -rf "$PROFILE_DIR/$PKG_NAME"
mkdir -p "$PROFILE_DIR/$PKG_NAME"
cp "$SRC/package.json" "$PROFILE_DIR/$PKG_NAME/"
cp -R "$SRC/lib" "$PROFILE_DIR/$PKG_NAME/lib"
[ -f "$SRC/LICENSE" ] && cp "$SRC/LICENSE" "$PROFILE_DIR/$PKG_NAME/" || true

echo "==> linking into profile module tree"
mkdir -p "$DSH_HOME/profiles/node_modules"
ln -sfn "../web/$PKG_NAME" "$DSH_HOME/profiles/node_modules/$PKG_NAME"

echo "==> locating DSH runtime tree"
DSH_ROOT="${1:-${DSH_ROOT:-}}"
if [ -z "$DSH_ROOT" ]; then
  DSH_ROOT=$(node -e '
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
  ') || {
    echo "ERROR: cannot auto-detect the DSH runtime tree." >&2
    echo "Re-run with the node_modules root that contains @deepseek-ai/dsh, e.g.:" >&2
    echo "  ./install.sh ~/.npm/_npx/<hash>/node_modules" >&2
    exit 1
  }
fi
[ -d "$DSH_ROOT/@deepseek-ai/dsh" ] || { echo "ERROR: $DSH_ROOT does not contain @deepseek-ai/dsh" >&2; exit 1; }
echo "    runtime root: $DSH_ROOT"
ln -sfn "$PROFILE_DIR/$PKG_NAME" "$DSH_ROOT/$PKG_NAME"

echo "==> mounting row in $PROFILE_DIR/cordis.patch.yml"
node -e '
  const fs = require("fs"), path = require("path");
  const file = process.argv[1], root = process.argv[2];
  const ROW = [
    "# Token usage dashboard (dsh-token-usage). Remove this entry to uninstall.",
    "- insert:",
    "    - id: token-usage",
    "      name: \x27dsh-token-usage\x27"
  ].join("\n");
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "[]";
  const stripped = text.replace(/#.*/g, "").trim();
  let out;
  if (stripped === "" || stripped === "[]") {
    out = ROW + "\n";
  } else if (/^\s*-?\s*id:\s*token-usage\s*$/m.test(text)) {
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
' "$PROFILE_DIR/cordis.patch.yml" "$DSH_ROOT"

echo
echo "Done. Restart DSH ('dsh web' / your launcher), then open Settings -> Token 用量"
