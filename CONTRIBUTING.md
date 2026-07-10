# Contributing to Yuzic

Thanks for your interest in contributing! This doc covers what you need to get
the app running locally and how changes get merged.

## Before you start

- **Bug or small fix?** Feel free to open a PR directly.
- **New feature or larger change?** Please open an issue first (or comment on
  an existing one) so we can talk through the approach before you put time
  into it.
- Questions are welcome on [Discord](https://discord.gg/NzsGEhg5Fs).

## Local setup

```sh
npm install
```

Yuzic can't run in plain Expo Go — playback (`@rntp/player`), storage
(MMKV), Google Cast, and DLNA discovery are all native modules that Expo Go
doesn't ship. You need a dev-client build instead:

```sh
npx expo run:android   # requires Android Studio / an Android SDK
npx expo run:ios       # requires Xcode, macOS only
```

Once the dev client is installed on a device/simulator, day-to-day iteration
is the normal Expo flow:

```sh
npx expo start
```

### Testing against a server

You don't need your own media server to try most of the app — onboarding
includes a **Navidrome demo** (`demo.navidrome.org`) that works out of the
box. Jellyfin and Emby have no equivalent public demo, so testing those
integrations requires a self-hosted instance you point the app at.

No API keys or `.env` are required to build the app. A few features talk to
services baked in at the constant level rather than configured by you:

- Last.fm / ListenBrainz scrobbling is authenticated per-user at runtime via
  Settings — nothing to set up to build the app.
- The slskd/Lidarr download-transcode pipeline (`RAWARR_URL` in
  `src/constants/rawarr.ts`) points at a hosted service run by the
  maintainer, not something you can self-host or point elsewhere. Keep that
  in mind if you're testing download-related changes.

### Linting, types, and tests

```sh
npm run lint
npx tsc --noEmit
npx jest --ci
```

These three are exactly what `.github/workflows/pr-checks.yml` runs on every
push/PR to `dev` and `master` — branch protection gates on this check, so a
PR won't be mergeable until it's green.

### End-to-end tests

E2E coverage uses Maestro against an installed dev-client build — see
[`.maestro/README.md`](.maestro/README.md) for setup and how to run it.

## Branch model

- `dev` is the integration branch. **Open PRs against `dev`**, not `master`.
- `master` is the stable/release branch, updated by promoting `dev` via a
  separate PR — not something contributor PRs should target directly.

## Touching CI workflows or release config

If your change touches anything under `.github/workflows/` or `fastlane/`,
read [`AGENTS.md`](AGENTS.md) first. In particular: Android versionCode and
iOS build number are derived automatically from a run counter plus a fixed
offset, specifically to prevent Play/App Store Connect from rejecting a
build with a duplicate version code. Don't reintroduce manual version
inputs — `AGENTS.md` explains why and documents the full mechanism.

## Pull requests

- Use the PR template — fill in the summary, testing, and related-issue
  sections.
- Keep PRs focused; a bug fix doesn't need an unrelated refactor riding
  along with it.
- Make sure lint/typecheck/tests pass locally before pushing — it saves a
  round trip through CI.
