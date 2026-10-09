#!/usr/bin/env bash
# Fetch one DESIGN.md from the open-source awesome-design-md catalog (MIT).
#
# Usage: fetch_design_md.sh <slug> <dest_dir>
#   slug: a name from references/catalog.md, e.g. stripe, linear.app, posthog
# Writes: <dest_dir>/DESIGN.md (untouched upstream copy) and <dest_dir>/SOURCE.md (attribution)
#
# Only this one public GitHub repo is fetched. Refero is never fetched by script:
# its robots.txt disallows AI agents, so Refero styles come in through the official
# Refero MCP or a file the user downloads by hand (see references/sources.md).
set -euo pipefail

if [ $# -ne 2 ]; then sed -n '2,10p' "$0"; exit 2; fi
slug="$1"; dest="$2"

if ! [[ "$slug" =~ ^[a-z0-9][a-z0-9.-]*$ ]]; then
  echo "invalid slug: $slug" >&2; exit 2
fi

repo="VoltAgent/awesome-design-md"
url="https://raw.githubusercontent.com/$repo/main/design-md/$slug/DESIGN.md"
mkdir -p "$dest"

code=$(curl -sSL -w '%{http_code}' -o "$dest/DESIGN.md" "$url" || true)
if [ "$code" != "200" ] || [ ! -s "$dest/DESIGN.md" ]; then
  rm -f "$dest/DESIGN.md"
  echo "fetch failed ($code): $url" >&2
  echo "check the slug against https://github.com/$repo/tree/main/design-md" >&2
  exit 1
fi

cat > "$dest/SOURCE.md" <<EOF
# Source

- Catalog: awesome-design-md (https://github.com/$repo), MIT License
- File: design-md/$slug/DESIGN.md
- Fetched: $(date -u +%Y-%m-%dT%H:%MZ)
- Upstream note: these files are unofficial "inspired interpretations" of public websites,
  not official design systems of the named companies.
- Use in this project: starting skeleton only. Identity (name, accent, display font, motif)
  is replaced during adaptation so the product does not clone the source brand (antislop R-30).
EOF

lines=$(wc -l < "$dest/DESIGN.md" | tr -d ' ')
if head -1 "$dest/DESIGN.md" | grep -q '^---'; then fm="yes"; else fm="no (normalize before tokens)"; fi
echo "$dest/DESIGN.md  ($lines lines, frontmatter: $fm)"
