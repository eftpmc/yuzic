# Agent instructions for yuzic

## Branch model

- `dev` is the long-running integration branch. Push work here (directly or via PR) — do not delete it after merging.
- `master` is the stable/release branch. Promote work from `dev` to `master` via a PR (e.g. #137), not by pushing directly.
- Both branches have GitHub branch protection requiring the `Lint, Typecheck & Test` check (from `.github/workflows/pr-checks.yml`) to pass before a PR can merge. Repo admins can bypass this for direct pushes — it does not block `git push` outright.

## CI

- `.github/workflows/pr-checks.yml`: lint (`npm run lint`), typecheck (`npx tsc --noEmit`), and tests (`npx jest --ci`) on every push/PR to `master` and `dev`. Keep this green — it's what branch protection gates on.
- `.github/workflows/android-build.yml` / `ios-build.yml`: build and ship to Play's alpha track / App Store Connect (TestFlight only — `submit_for_review: false`, never public review). Runnable manually (`workflow_dispatch`) or called by the release workflow (`workflow_call`). No manual version inputs — see below.
- `.github/workflows/release-on-version-bump.yml`: on push to `master`, if `package.json`'s `version` field changed from the previous commit, automatically calls both build workflows.

## Version numbers — do not reintroduce manual overrides

Android versionCode and iOS build number are derived automatically and must **never** be manually typed in per-run — a human-entered duplicate is exactly what gets a build rejected by Play/App Store Connect, since both require every new version code/build number to be strictly greater than everything published before.

The mechanism (see `fastlane/Fastfile`):
- `VERSION_LABEL` (e.g. `1.3.7`) is read directly from `package.json` at build time — single source of truth, never passed as a workflow input.
- `ANDROID_VERSION_CODE` / `IOS_BUILD_NUMBER` derive from `GITHUB_RUN_NUMBER` (GitHub's per-workflow-file counter — starts at 1, increments forever, never resets or repeats) **plus a fixed offset** (`ANDROID_LAST_PUBLISHED_VERSION_CODE` / `IOS_LAST_PUBLISHED_BUILD_NUMBER` constants at the top of `Fastfile`). The offset exists because CI's run counter started from 0 while the stores already had real published versions ahead of it.

**Last known published versions** (recorded here so this doesn't silently break again):
- Android: version 1.3.7, versionCode **109**
- iOS: version 1.3.7, build **1**

If you ever need to raise these offset constants (e.g. because a manual/local Fastlane run published a version CI didn't know about), only ever increase them, and update this table to match. Do not remove the offset mechanism or reintroduce `workflow_dispatch` inputs for version numbers — that reopens the exact collision risk it was built to close.

## Native/player notes

- Audio playback goes through `@rntp/player` (the npm-scoped continuation of `react-native-track-player`, now under a commercial license as of v5 — see `node_modules/@rntp/player/package.json`). Keep it reasonably current; v5.0.0 → v5.6.0 fixed real bugs (notably `file://` local-playback support added in 5.2.0).
- `src/contexts/PlayingContext.tsx` is the central playback state/controls context — most player-related work touches this file.

## UI conventions

These were made consistent across the app in one pass; they drift back easily
because both halves of each pair look reasonable in isolation.

- **Loading**: skeletons (`components/Skeleton*`, or a screen's own
  `Loading.tsx`) when a list is loading, so the placeholder holds the shape the
  list is about to take. `components/SpinningLoaderCircle` everywhere else —
  inside a control at size 18, for a whole sheet or screen at 26. React
  Native's `ActivityIndicator` is deliberately unused: it renders differently
  per platform and doesn't match the lucide icon set the rest of the UI uses.
  A skeleton is only worth using when it predicts the real layout; an options
  sheet is a header and a stack of actions, so it keeps a spinner.
- **Home vs Library**: Home is what changes, Library is what's complete. A view
  that moves on its own — recently added, most played, what you were listening
  to — is a Home shelf; the stable, exhaustive, sortable list is a Library
  collection. The same data may appear in both, but never as the same thing
  twice: Home shows the first handful and its heading leads to Library's full
  version (`SectionShelfHeader`'s `onSeeAll`). Recently added is the worked
  example — a shelf on Home, a row and a collection screen in Library.
- **Library navigation**: the library tab is an index, each row opening its own
  screen (`screens/library/LibraryCollectionScreen`) — nothing else lives on it.
  It used to be a row of filter pills, which could only ever show the types it
  had room for — that is why genres had no way in for so long. Adding a way to
  browse means adding an entry row, not a pill and not a section.
- **Library gutter**: horizontal insets in the library come from
  `screens/library/layout`, never from a literal. A list row and a grid cell
  each carry an inset of their own, so the list's padding is the difference
  that lands artwork exactly `spacing.page` from the screen edge in both modes.
  Anything drawn above the items — a header, the sort row — cancels that
  padding with a negative margin and keeps `spacing.page`, so all of it lines
  up on one edge.
- **Collection actions**: a screen led by artwork uses `DetailHeader`'s centred
  circle-and-pill pair. A screen without artwork uses
  `screens/library/CollectionActions` — two square-shouldered halves of the
  content width, which have to carry the top of the screen on their own.
- **Translations**: every key added to `locales/en.json` is added to all four
  locales in the same change; `locales/locales.test.ts` fails otherwise. A
  missing key falls back to English mid-sentence, so it reads as a bug rather
  than as an untranslated string.
- **Home**: sections are grouped into tiers by `features/home/homeLayout` —
  resume first and unlabelled, then your own library, then external discovery
  behind its source header. A new section belongs to exactly one tier, and the
  library tier stays short: it carries what changes on its own, not everything
  that could be shown. Discovery is off by default (`deezerDiscoveryEnabled`)
  and absent offline, so the local tiers are all a fresh install has — Home
  cannot be emptied out on the assumption that discovery will fill it.
