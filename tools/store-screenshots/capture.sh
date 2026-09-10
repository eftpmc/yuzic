#!/usr/bin/env bash
# Regenerate the App Store / Play store screenshots end to end.
#
#   ./capture.sh                # both devices
#   ./capture.sh phone          # one device
#
# Boots a clean simulator at exactly the pixel size of the mockup frame's glass
# aperture, seeds it with the app + your server login, drives the app with
# Maestro, and composites the captures into finished marketing images.
#
# Nothing here is retouched by hand — edit spec.json for caption text.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
APP_ID="com.arinora.rawarr"

# The simulator must match the frame aperture natively; scaling a different
# device's capture up to it resamples the UI and softens all the text.
#   phone frame aperture 1242x2688 -> iPhone 11 Pro Max
#   ipad  frame aperture 2048x2732 -> iPad Pro 12.9" (6th gen)
PHONE_DEVICE="iPhone 11 Pro Max"
IPAD_DEVICE="iPad Pro (12.9-inch) (6th generation)"
RUNTIME="${RUNTIME:-iOS-26-5}"

APP_PATH="${APP_PATH:-/tmp/yzbuild/Build/Products/Release-iphonesimulator/Yuzic.app}"

# Light or dark. Read from spec.json so the appearance lives with the captions
# rather than being a flag you have to remember to pass.
APPEARANCE="$(python3 -c "import json,pathlib;print(json.loads(pathlib.Path('$HERE/spec.json').read_text()).get('appearance','dark'))")"

if [[ ! -d "$APP_PATH" ]]; then
  echo "No simulator build at $APP_PATH" >&2
  echo "Build one with:" >&2
  echo "  cd $REPO/ios && xcodebuild -workspace Yuzic.xcworkspace -scheme Yuzic \\" >&2
  echo "    -configuration Release -sdk iphonesimulator -derivedDataPath /tmp/yzbuild \\" >&2
  echo "    -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build" >&2
  exit 1
fi

# The app's persisted server list, lifted from a simulator you already logged
# into. Keeps credentials out of git — see README.
SEED="${SEED_STORE:-$HOME/.config/yuzic/screenshot-store}"

# Tear the simulator down even if a build/install/Maestro step fails. Without
# this, `set -e` skips the cleanup at the end of run_device and leaves a booted
# simulator behind; a few of those will saturate a laptop and make every later
# run look mysteriously slow.
CURRENT_SIM=""
cleanup() {
  if [[ -n "$CURRENT_SIM" ]]; then
    xcrun simctl shutdown "$CURRENT_SIM" >/dev/null 2>&1 || true
    xcrun simctl delete "$CURRENT_SIM" >/dev/null 2>&1 || true
    CURRENT_SIM=""
  fi
}
trap cleanup EXIT INT TERM

run_device() {
  local key="$1" device="$2" simname="yz-shot-$1"
  echo "==> $key ($device)"

  xcrun simctl delete "$simname" >/dev/null 2>&1 || true
  local udid
  udid=$(xcrun simctl create "$simname" "$device" "com.apple.CoreSimulator.SimRuntime.$RUNTIME")
  CURRENT_SIM="$udid"
  xcrun simctl boot "$udid"
  xcrun simctl bootstatus "$udid" -b

  # A clean, deterministic status bar. This is what the old PSDs were painting
  # over by hand with a black scribble layer.
  xcrun simctl status_bar "$udid" override \
    --time "9:41" \
    --cellularMode active \
    --cellularBars 4 \
    --wifiMode active \
    --wifiBars 3 \
    --batteryState charged \
    --batteryLevel 100

  # The app's themeMode defaults to 'system', so the simulator appearance is
  # what actually decides light vs dark in the captures.
  xcrun simctl ui "$udid" appearance "$APPEARANCE"

  # Kill the first-run keyboard tutorials. A swipe that crosses the keyboard
  # otherwise triggers the QuickPath ("slide your finger to type") popover,
  # which then eats the next tap. Also stops the predictive bar from appearing
  # in a capture.
  local prefs="$HOME/Library/Developer/CoreSimulator/Devices/$udid/data/Library/Preferences"
  mkdir -p "$prefs"
  defaults write "$prefs/com.apple.keyboard.preferences.plist" \
    DidShowContinuousPathIntroduction -bool true
  defaults write "$prefs/com.apple.Preferences.plist" \
    KeyboardContinuousPathEnabled -bool false
  defaults write "$prefs/com.apple.Preferences.plist" \
    KeyboardPrediction -bool false

  xcrun simctl install "$udid" "$APP_PATH"

  # Seed the logged-in server so the app has real library content to show.
  if [[ -d "$SEED" ]]; then
    xcrun simctl launch "$udid" "$APP_ID" >/dev/null
    sleep 5
    xcrun simctl terminate "$udid" "$APP_ID" >/dev/null 2>&1 || true
    local container
    container=$(xcrun simctl get_app_container "$udid" "$APP_ID" data)
    mkdir -p "$container/Documents/mmkv"
    cp "$SEED"/* "$container/Documents/mmkv/"
    echo "    seeded server login"
  else
    echo "    ! no seed at $SEED — app will start logged out, see README" >&2
  fi

  local raw="$HERE/raw/$key"
  rm -rf "$raw" && mkdir -p "$raw"

  # `--env` belongs to the `test` subcommand, not to `maestro` itself — placed
  # before it, the CLI prints its usage banner and exits without running.
  # Environment variables are NOT inherited from the shell either: a var only
  # reaches a `${...}` condition if it is passed with --env, and a name that
  # never arrives makes the condition silently false rather than erroring, so
  # the guarded block is skipped with nothing in the log to say why.
  maestro --device "$udid" test \
    --env SHOT_DEVICE="$key" --env MAESTRO_SHOT_DIR="$raw" \
    "$REPO/.maestro/store-screenshots.yaml"

  python3 "$HERE/compose.py" --device "$key" --raw "$raw" --out "$HERE/out/$key"

  cleanup
}

target="${1:-both}"
case "$target" in
  phone) run_device phone "$PHONE_DEVICE" ;;
  ipad)  run_device ipad  "$IPAD_DEVICE" ;;
  both)  run_device phone "$PHONE_DEVICE"; run_device ipad "$IPAD_DEVICE" ;;
  *) echo "usage: $0 [phone|ipad|both]" >&2; exit 2 ;;
esac

echo
echo "Done. Finished screenshots in $HERE/out/"
