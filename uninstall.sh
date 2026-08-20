#!/usr/bin/env bash
# dsh-panel unified uninstaller
# Usage: ./uninstall.sh [TARGET] [DSH_ROOT]
#   TARGET:   all (default) | dsh-token-usage | dsh-better-sidebar | <module under modules/>
#   DSH_ROOT: DSH runtime node_modules root (optional; runtime link skipped if omitted)
# Legacy usage './uninstall.sh <DSH_ROOT>' still works (detected by path shape).
set -euo pipefail

DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME/profiles/web"
PATCH="$PROFILE_DIR/cordis.patch.yml"

TARGET="${1:-all}"
DSH_ROOT_ARG="${2:-}"
# backward compat: first arg pointing at a DSH runtime tree is a DSH_ROOT
if [ -n "$TARGET" ] && [ -d "$TARGET/@deepseek-ai/dsh" ]; then
  DSH_ROOT_ARG="$TARGET"
  TARGET="dsh-token-usage"
fi

# uninstall_pkg PKG_NAME PLUGIN_ID
#   PKG_NAME: npm package name
#   PLUGIN_ID: cordis.patch.yml insert id used for row matching
uninstall_pkg() {
  local PKG_NAME="$1" PLUGIN_ID="$2"
  echo
  echo "==> [$PKG_NAME] removing mount row from $PATCH"
  if [ -f "$PATCH" ]; then
    cp "$PATCH" "$PATCH.bak-uninstall"
    node -e '
      const fs = require("fs");
      const file = process.argv[1], id = process.argv[2];
      const text = fs.readFileSync(file, "utf8");
      const lines = text.split("\n");
      // Group lines into top-level list items (a "- " at column 0) plus any
      // comment/blank lines immediately preceding it. Drop any group whose
      // body mentions the plugin id, keep everything else verbatim.
      const groups = [];
      let pendingComments = [];
      let current = null;
      const flush = () => { if (current) { groups.push(current); current = null; } };
      for (const line of lines) {
        if (/^- /.test(line)) {
          flush();
          current = { comments: pendingComments, body: [line] };
          pendingComments = [];
        } else if (/^\s*$/.test(line) || /^#/.test(line)) {
          // blank or column-0 comment closes the current item; it becomes
          // leading comment of the next group
          flush();
          pendingComments.push(line);
        } else if (current) {
          current.body.push(line);
        } else {
          pendingComments.push(line);
        }
      }
      flush();
      const kept = [];
      let removed = false;
      for (const g of groups) {
        if (g.body.join("\n").includes(id)) {
          removed = true;
          kept.push(...g.comments.filter((c) => !c.includes(id)));
          continue;
        }
        kept.push(...g.comments, ...g.body);
      }
      let out = [...pendingComments, ...kept].join("\n");
      out = out.replace(/\n{3,}/g, "\n\n");
      if (out.replace(/#.*/g, "").trim() === "") out = "[]\n";
      fs.writeFileSync(file, out);
      console.log(removed ? "    row removed (backup: " + file + ".bak-uninstall)" : "    row not found");
    ' "$PATCH" "$PLUGIN_ID"
  fi

  echo "==> [$PKG_NAME] removing links and package dir"
  rm -f "$DSH_HOME/profiles/node_modules/$PKG_NAME"
  if [ -n "$DSH_ROOT_ARG" ]; then
    rm -f "$DSH_ROOT_ARG/$PKG_NAME"
    echo "    removed $DSH_ROOT_ARG/$PKG_NAME"
  fi
  rm -rf "$PROFILE_DIR/$PKG_NAME"
}

uninstall_better_sidebar() {
  local PKG="dsh-better-sidebar"
  echo
  echo "==> [$PKG] removing via official CLI"
  local CLI="dsh"
  command -v dsh >/dev/null || CLI="npx -y --package @deepseek-ai/dsh dsh"
  $CLI plugin --profile web remove "$PKG"
}

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
case "$TARGET" in
  all)
    uninstall_pkg "dsh-token-usage" "token-usage"
    for dir in "$SCRIPT_DIR"/modules/*/; do
      pkg=$(basename "$dir")
      [ -f "$dir/package.json" ] || continue
      uninstall_pkg "$pkg" "${pkg#dsh-}"
    done
    uninstall_better_sidebar
    if [ -z "$DSH_ROOT_ARG" ]; then
      echo
      echo "(pass DSH_ROOT to also remove runtime-tree links, e.g. ./uninstall.sh all ~/.npm/_npx/<hash>/node_modules)"
    fi
    ;;
  dsh-token-usage)
    uninstall_pkg "dsh-token-usage" "token-usage"
    ;;
  dsh-better-sidebar)
    uninstall_better_sidebar
    ;;
  *)
    [ -f "$SCRIPT_DIR/modules/$TARGET/package.json" ] || { echo "ERROR: unknown target '$TARGET' (expected: all | dsh-token-usage | dsh-better-sidebar | module under modules/)" >&2; exit 1; }
    uninstall_pkg "$TARGET" "${TARGET#dsh-}"
    ;;
esac

echo
echo "Done. Restart DSH to finish removal."
