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

To run the common user-flow coverage directly:

```sh
npm run test:e2e:flows
```

## Current Coverage

- App launches without crashing.
- Authenticated shell can move between Home and Library.
- Library can filter to tracks and start playback.
- The player bar appears after playback starts.
- Search opens from Home, accepts input, renders a no-results state, and can return.

The suite intentionally avoids assumptions about specific song titles or server fixtures. Good next flows are opening album/artist/playlist detail screens, search result actions against a seeded test server, options sheets, and queue/player detail interactions.
