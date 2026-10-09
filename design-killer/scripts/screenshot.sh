#!/usr/bin/env bash
# Screenshot a local HTML file at mobile / tablet / laptop widths with headless Chrome.
#
# Usage: screenshot.sh <file.html> <out_dir> [sizes...]
#   size: a width (375) or an exact WIDTHxHEIGHT (1200x630, 180x180)
#   default sizes: 360 768 1440 (360 = minimum width in the team's PRD packages)
# Output: <out_dir>/<name>-<size>.png
#
# Used to (a) make thumbnails for the option comparison page, (b) eyeball HI-FI
# screens at every breakpoint before the Delivery Gate. Exits 3 if no Chromium-family
# browser is found, so the caller can fall back to "open the file and look".
set -euo pipefail

if [ $# -lt 2 ]; then
  sed -n '2,11p' "$0"; exit 2
fi

src="$1"; out="$2"; shift 2
widths=("$@"); [ ${#widths[@]} -eq 0 ] && widths=(360 768 1440)

[ -f "$src" ] || { echo "not found: $src" >&2; exit 1; }
mkdir -p "$out"
abs="$(cd "$(dirname "$src")" && pwd)/$(basename "$src")"
name="$(basename "$src" .html)"

browser=""
for c in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  "$(command -v google-chrome 2>/dev/null || true)" \
  "$(command -v chromium 2>/dev/null || true)" \
  "$(command -v chromium-browser 2>/dev/null || true)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then browser="$c"; break; fi
done
[ -n "$browser" ] || { echo "no Chromium-family browser found; open $src manually" >&2; exit 3; }

# Headless Chrome will not make a window narrower than 500px, so a 360px shot would
# silently render a 500px layout. Below that, load the page in an iframe of the exact
# width, centered in a 500px wrapper, then center-crop the gutters away (sips on macOS)
# or leave them.
MIN_WINDOW=500
tmpdir="$(mktemp -d)"; trap 'rm -rf "$tmpdir"' EXIT

for size in "${widths[@]}"; do
  if [[ "$size" == *x* ]]; then w="${size%x*}"; h="${size#*x}"; else w="$size"; h=$(( w < 600 ? 2400 : 1800 )); fi
  png="$out/${name}-${size}.png"
  rm -f "$png"
  target="file://$abs"; win_w="$w"
  if [ "$w" -lt "$MIN_WINDOW" ]; then
    wrapper="$tmpdir/wrap-${w}.html"
    printf '<!doctype html><html><body style="margin:0;background:#fff"><iframe src="%s" style="display:block;margin:0 auto;border:0;width:%spx;height:%spx"></iframe></body></html>' \
      "file://$abs" "$w" "$h" > "$wrapper"
    target="file://$wrapper"; win_w="$MIN_WINDOW"
  fi
  "$browser" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --virtual-time-budget=4000 --window-size="${win_w},${h}" \
    --screenshot="$png" "$target" >/dev/null 2>&1 || true
  if [ -f "$png" ] && [ "$win_w" != "$w" ] && command -v sips >/dev/null 2>&1; then
    sips -c "$h" "$w" "$png" >/dev/null 2>&1 || true
  fi
  if [ -f "$png" ]; then echo "$png"; else echo "failed at $size" >&2; fi
done
