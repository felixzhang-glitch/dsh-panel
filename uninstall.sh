#!/usr/bin/env bash
# dsh-token-usage uninstaller
# Usage: ./uninstall.sh [DSH_ROOT]
set -euo pipefail

PKG_NAME="dsh-token-usage"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME/profiles/web"

echo "==> removing mount row from $PROFILE_DIR/cordis.patch.yml"
PATCH="$PROFILE_DIR/cordis.patch.yml"
if [ -f "$PATCH" ]; then
  cp "$PATCH" "$PATCH.bak-uninstall"
  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const text = fs.readFileSync(file, "utf8");
    const lines = text.split("\n");
    // Group lines into top-level list items (a "- " at column 0) plus any
    // comment/blank lines immediately preceding it. Drop any group whose
    // body mentions token-usage, keep everything else verbatim.
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
      if (g.body.join("\n").includes("token-usage")) {
        removed = true;
        kept.push(...g.comments.filter((c) => !c.includes("token-usage")));
        continue;
      }
      kept.push(...g.comments, ...g.body);
    }
    let out = [...pendingComments, ...kept].join("\n");
    out = out.replace(/\n{3,}/g, "\n\n");
    if (out.replace(/#.*/g, "").trim() === "") out = "[]\n";
    fs.writeFileSync(file, out);
    console.log(removed ? "    row removed (backup: " + file + ".bak-uninstall)" : "    row not found");
  ' "$PATCH"
fi

echo "==> removing links"
rm -f "$DSH_HOME/profiles/node_modules/$PKG_NAME"
DSH_ROOT="${1:-${DSH_ROOT:-}}"
if [ -n "$DSH_ROOT" ]; then
  rm -f "$DSH_ROOT/$PKG_NAME"
  echo "    removed $DSH_ROOT/$PKG_NAME"
else
  echo "    (pass DSH_ROOT to also remove the runtime-tree link, e.g. ./uninstall.sh ~/.npm/_npx/<hash>/node_modules)"
fi

echo "==> removing package dir"
rm -rf "$PROFILE_DIR/$PKG_NAME"

echo
echo "Done. Restart DSH to finish removal."
