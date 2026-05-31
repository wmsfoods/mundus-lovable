#!/usr/bin/env bash
# Capacitor CLI expects ios/App/App.xcodeproj; the real project is MundusTrade.xcodeproj.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LINK="$ROOT/ios/App/App.xcodeproj"
TARGET="MundusTrade.xcodeproj"

cd "$ROOT/ios/App"
if [[ -L App.xcodeproj ]]; then
  exit 0
fi
if [[ -d App.xcodeproj && ! -L App.xcodeproj ]]; then
  echo "ios/App/App.xcodeproj exists as a directory (expected MundusTrade.xcodeproj + symlink)." >&2
  exit 1
fi
ln -sf "$TARGET" App.xcodeproj
