# Store screenshots

Regenerates the App Store and Play Store screenshots from a live simulator
instead of retaking them by hand in Photoshop.

```sh
./capture.sh            # phone + ipad
./capture.sh phone
python3 publish.py      # copy framed creatives into Fastlane metadata
python3 publish.py --readme  # copy clean phone captures into README assets
```

Output lands in `out/phone/` and `out/ipad/` as `1.png`…`5.png`.

`publish.py` separates the two published outputs from the same capture:

- `python3 publish.py` copies the framed, captioned composites into Fastlane's
  store-listing metadata tree.
- `python3 publish.py --readme` copies four clean, unframed phone captures into
  `assets/screenshots/` for the README gallery. It never reads or writes a
  Fastlane path.

`deliver` and `supply` each want their own directory layout and filenames, and
neither reads `out/`. Both commands assert their respective inputs before
writing; `--check` verifies store sizes and `--check-readme` validates the raw
README captures without writing.

Both upload steps are enabled in `fastlane/Fastfile`, so a version bump on
`master` replaces the live listing images. **Play caps each device type at 8
screenshots**, so `metadata/android/en-US/images/*Screenshots/` must hold only
the current set — a stale extra file fails the upload rather than adding an
image.

## What it does

1. Creates a throwaway simulator whose screen is **exactly** the mockup frame's
   glass aperture — 1242×2688 (iPhone 11 Pro Max) and 2048×2732 (iPad Pro 12.9").
2. Freezes the status bar with `simctl status_bar override` (9:41, full bars,
   full battery).
3. Installs a Release simulator build and seeds it with a logged-in server so
   there is real library content on screen.
4. Drives the app to each screen with `.maestro/store-screenshots.yaml` and
   captures raw screenshots.
5. Composites each capture into its device frame with the caption text, via
   `compose.py`.

## Editing captions

All text lives in `spec.json` — headline, subline, and which layout each screen
uses. Change it there and re-run; nothing is baked into an image.

Adding a screen means adding an entry to `screens` in `spec.json` *and* a
matching `takeScreenshot` step in `.maestro/store-screenshots.yaml`. The `id`
in the spec is the screenshot filename the flow writes.

## Layouts

Each screen picks one of three device placements, measured out of the original
PSDs. Set it per screen with `"layout"`:

| Layout | Device | Caption |
| --- | --- | --- |
| `top` | below the text, cropped off the bottom edge | logo + headline + subline above |
| `centered` | shown whole | large logo only, centred above |
| `bottom` | at the top, cropped off the *top* edge | logo + headline + subline below |

`centered` deliberately has no caption and uses the larger 208px logo, matching
`2.psd` / `2ipad.psd`. In `bottom` the device sits at a negative Y offset and is
clipped by the canvas, matching `4.psd` / `4ipad.psd`.

## Light or dark

`"appearance"` in `spec.json` (`dark` or `light`) is applied with
`simctl ui <udid> appearance`. The app's own `themeMode` defaults to `system`,
so the simulator appearance is what decides — there is no in-app toggle to
drive.

## Pinned content

The Maestro flow navigates to **specific** titles (searching for them by name)
rather than tapping whichever row happens to sort first, so the marketing shots
stay stable as the library grows. Changing the featured song or artist means
editing the `text:` matchers in `.maestro/store-screenshots.yaml`.

The downloads screen needs downloaded items to look like anything; the flow
triggers a download from the artist screen and waits for it to finish.

## Prerequisites

**A Release simulator build**, which `capture.sh` expects at
`/tmp/yzbuild/Build/Products/Release-iphonesimulator/Yuzic.app`:

```sh
cd ios && xcodebuild -workspace Yuzic.xcworkspace -scheme Yuzic \
  -configuration Release -sdk iphonesimulator -derivedDataPath /tmp/yzbuild \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

Override the location with `APP_PATH=... ./capture.sh`.

**A seeded login** at `~/.config/yuzic/screenshot-store/` — the app's MMKV
store copied out of a simulator you have already logged into:

```sh
cp "$(xcrun simctl get_app_container booted com.arinora.rawarr data)/Documents/mmkv/"* \
   ~/.config/yuzic/screenshot-store/
```

This is deliberately **outside the repo**: it contains your server password in
plaintext. Never commit it. Point elsewhere with `SEED_STORE=...`.

**Maestro** (`curl -Ls https://get.maestro.mobile.dev | bash`) and Pillow +
psd-tools (`pip3 install pillow`).

## Where the frames came from

`assets/phone_frame.png` and `assets/ipad_frame.png` were extracted from the
original PSDs in `Documents/Graphics/yuzic` **on the Windows desktop** (layers
`Apple iPhone XS Space Grey` and `Apple iPad Pro 13 Space Gray - Portrait`),
which came from [mockuphone.com](https://mockuphone.com/type/all/). `logo.png`
and the Inter Bold/Light fonts came from the same files, so output matches what
shipped. Copy them to `reference/` (gitignored) to diff a regenerated shot
against the one that actually shipped — that comparison is the only thing that
catches a screen being subtly wrong.

The PSDs also carried a hand-painted black scribble layer patching transparent
gaps where the screenshot didn't quite fill the frame, plus blackout over the
status bar. Neither is needed here: captures are taken at the aperture's exact
size, and the status bar is set through `simctl` rather than covered up.

## Gotchas

- The capture simulator must be the device whose native resolution equals the
  aperture. Capturing on a different device and scaling up resamples the UI and
  visibly softens text.
- Text is placed **ink-anchored**, not baseline-anchored: `spec.json` positions
  are the PSD's ink bounding boxes. Anchoring on the font baseline drops every
  caption about 30px. See `draw_multiline` in `compose.py`.
- The keyboard on the search screen covers the mini player *and* the tab bar, so
  a tab tap lands on a key instead. The flow dismisses it with a drag confined
  above the keyboard — a swipe across the keys opens iOS's QuickPath tutorial,
  which then eats the next tap. `capture.sh` also pre-disables that tutorial.
- Playback is async: after tapping a search result the mini bar can still show
  the previous track. The flow waits for the expected title before opening the
  full player, or it captures the wrong song.
- The album header's download button does nothing while the track list is still
  loading, and fails silently. The flow waits for a `song-row` first.
- Library entries (`albums`, `artists`, `downloaded`) sit below the fold, so the
  flow uses `scrollUntilVisible` rather than waiting for them to appear.
- Play caps the feature graphic at 1024×500; that one is still a manual asset
  (`feature.psd`) and is not generated here.
