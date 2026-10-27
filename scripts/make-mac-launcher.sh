#!/bin/zsh
# Crée « Cavarum.app », un lanceur macOS qui ouvre l'app en ligne dans Safari
# (même principe que AgenceManager.app).
#   npm run launcher                 → crée ~/Desktop/Cavarum.app
#   npm run launcher -- /Applications
set -euo pipefail

destination="${1:-$HOME/Desktop}"
url="${CAVARUM_URL:-https://elone693-jpg.github.io/cavarum/}"
root="${0:A:h:h}"
icon="$root/assets/brand/Cavarum.icns"
app="$destination/Cavarum.app"

[[ -f "$icon" ]] || { echo "Icône absente : lancez d'abord « npm run icons »." >&2; exit 1; }
[[ -e "$app" ]] && { echo "$app existe déjà : supprimez-le pour le recréer." >&2; exit 1; }

mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
cp "$icon" "$app/Contents/Resources/AppIcon.icns"

cat > "$app/Contents/MacOS/Cavarum" <<SCRIPT
#!/bin/zsh
# Ouvre Cavarum (version en ligne) dans Safari.
/usr/bin/open -a Safari "$url"
SCRIPT
chmod +x "$app/Contents/MacOS/Cavarum"

cat > "$app/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Cavarum</string>
  <key>CFBundleDisplayName</key><string>Cavarum</string>
  <key>CFBundleIdentifier</key><string>fr.cavarum.lanceur</string>
  <key>CFBundleVersion</key><string>2.0</string>
  <key>CFBundleShortVersionString</key><string>2.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>Cavarum</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
PLIST

# Force le Finder à prendre en compte la nouvelle icône.
touch "$app"
echo "✓ $app → $url"
