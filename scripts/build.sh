#!/usr/bin/env bash
# Baut das Store-Paket: dist/belegtext-<version>-store.zip (manifest.json im ZIP-Wurzelverzeichnis).
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(node -p "require('./manifest.json').version")
node --check src/belegtext.js
node --check src/bridge.js
node --check src/background.js
mkdir -p dist
out="dist/belegtext-${version}-store.zip"
rm -f "$out"
zip -qr "$out" manifest.json LICENSE src vendor icons
echo "$out"
