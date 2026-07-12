# Maestro E2E

Maestro is used for black-box E2E coverage of the installed mobile app.

## Setup

Install Maestro locally:

```sh
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
```

Start the app with your normal Expo/dev-client workflow and make sure a simulator or device is connected:

```sh
npx expo start
```

Then run:

```sh
npm run test:e2e:smoke
```

or all Maestro flows sequentially:

```sh
npm run test:e2e
```

Individual suites: `test:e2e:flows` (common user flows), `test:e2e:details`
(detail screens, options sheet, player), `test:e2e:onboarding` (first-run
onboarding).

## Getting an authenticated app state

`smoke.yaml`, `common-user-flows.yaml`, and `detail-flows.yaml` assume the app
is already connected to a server with library content. `onboarding-demo.yaml`
provides that from a fresh install without real credentials: it walks first-run
onboarding and taps "Use Navidrome demo", which connects to the public
`demo.navidrome.org` server.

It needs fresh app state (no server configured). On a release build,
uninstall/reinstall is enough. On an Expo dev build, don't use Maestro's
`clearState` — it also wipes the dev client's saved Metro URL and the next
launch lands on the dev-client launcher instead of the app. Clear only the
app's MMKV storage instead:

```sh
xcrun simctl terminate booted <bundle-id>
rm -rf "$(xcrun simctl get_app_container booted <bundle-id> data)/Documents/mmkv"
```

Note: the demo server rate-limits cover art (HTTP 429), so covers render as
placeholders there — that's the server, not the app.

## Current Coverage

- App launches without crashing.
- First-run onboarding connects via the Navidrome demo (`onboarding-demo.yaml`).
- Authenticated shell can move between Home, Library, and Search.
- Library filters to albums/artists/playlists/tracks; album, artist, and
  playlist detail screens open and navigate back (playlist step is skipped
  when the server has no playlists).
- Long-pressing a track opens the song options sheet.
- Tapping a track starts playback, the player bar appears, the full player
  opens from it, and pan-down closes it.
- Search has its own tab, accepts input, and renders a no-results state.

The suite intentionally avoids assumptions about specific song titles or
server fixtures.

Known gap: controls inside the full-player bottom sheet (queue toggle, close
chevron) don't surface in the iOS accessibility tree even with testIDs and
accessibility labels set (@gorhom/bottom-sheet quirk), so the queue view isn't
exercised and the player is closed by gesture. The testIDs
(`playing-queue-toggle`, `playing-close`, `playing-queue`) are already in the
code if this becomes tappable later.
