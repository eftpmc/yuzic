# Agent instructions for yuzic

## Docs map

Read the doc that covers what you're touching before you touch it — these are
kept current, and a change that contradicts one is a change that needs the doc
updated in the same commit.

| Doc | Read it before |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | Adding a server provider, a player behaviour, a persisted playback field, or a synced library resource. Covers `ApiAdapter`, `playbackSlice`, `contentKind`, `useSync`, and where things live under `src/`. |
| [`docs/integrations.md`](docs/integrations.md) | Adding or changing a server, integration, or downloader, or calling a new endpoint on one. Carries the endpoint tables and the list of endpoints we deliberately don't call. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Setup, the three CI gates, E2E. |
| This file, below | Any UI work, and anything under `.github/workflows/` or `fastlane/`. |

**Keep them in sync.** A new integration, downloader, or outside endpoint
belongs in `docs/integrations.md`, and a new load-bearing pattern in
`docs/architecture.md` — in the same change, not afterwards. `README.md`
carries the user-facing summary of the servers/integrations/downloaders
tables; update it when that set changes.

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
- **Scales**: sizes come from `typography`, corner radii from `radius`, padding
  and margin from `spacing`, all in `constants/design`, everywhere — `eslint.config.js` fails the build on a
  literal `fontSize` or `borderRadius` outside that file. A role carries a size
  and a line height; a weight may be overridden at the call site
  (`{ ...typography.rowSubtitle, fontWeight: '500' }`), since weight was never
  the thing that drifted. Adding a role is fine; adding one that differs from an
  existing role only in size is how the app got to thirteen font sizes and
  twelve corner radii in the first place. `0` stays a literal — it is the
  absence of spacing rather than an amount of it. Any scrolling list ends with
  `spacing.scrollClearance`, which is what keeps its last row clear of the
  playing bar; four different numbers were doing that job and the short ones
  didn't.
- **Tap targets**: a control may be drawn smaller than `controlSize.minimumTarget`
  — a 34pt toggle beside a 34pt pill is the right drawing — but what the finger
  has to hit never is. `hitSlopFor(size)` makes up the difference; it returns
  undefined when none is needed, so it can be spread unconditionally. Seven
  controls were between 32 and 40pt with nothing padding them out.
- **Naming controls**: a pressable that draws no text carries an
  `accessibilityLabel`, from the `a11y.*` namespace in `locales` like any other
  string — `eslint-rules/touchable-needs-label` fails the build otherwise. One
  that *does* draw text does not: a screen reader reads the text already, and a
  label repeating it is a second copy to keep in sync. So the rule looks for
  readable content in the subtree and only asks where it finds none. 32 controls
  were silent, including every transport control on the player, and the labels
  that did exist were hardcoded English — a French UI read aloud in English.
  A role says what a thing is, never which one, so it is never a substitute for
  a label: add both. A control with two states says the second through
  `accessibilityState`, one with more than two through `accessibilityValue` —
  shuffle cycles through three, and a label that changed with the mode would
  read as a different button each time.
- **Text size**: `typography` scales its own leading by the system text size
  (`withScaledLeading`), because React Native scales `fontSize` and leaves
  `lineHeight` where it was written — at the accessibility sizes a 20pt role
  renders at 60pt in a 25pt box and every title in the app is sliced in half.
  Text inside a control whose height is structural — the playing bar, an avatar
  disc — takes a `maxFontSizeMultiplier` from `fontScaleCap` **and** its role
  from the matching `cappedTypography` set. One without the other is the
  mismatch that turns the bar into half a screen: the cap holds the glyphs but
  not the line box they sit in. `allowFontScaling={false}` is not the answer to
  either — it ignores the user's setting outright.
- **Pressing**: `components/Touchable`, never `TouchableOpacity` — the whole app
  was swapped over in one pass and there is no reason for a second answer to a
  press to exist. Android gets a ripple bounded to the component, every other
  platform an opacity dip, from one file so they can't drift apart per screen.
  `feedback="control"` for a bare icon whose target is bigger than the glyph,
  `"none"` for a wrapper handling a press on something else's behalf. There is
  deliberately no `activeOpacity`: seven different values were in use, which is
  seven answers to a question nobody was asking.
- **Cover colour**: `features/theme` extracts one accent from a piece of cover
  art and darkens it. `useCoverAccent` is the hook; `pickAccent` and `darken`
  are pure and tested, because the extraction library returns a different shape
  per platform and that choice is the part worth checking. The accent is null
  until it arrives, so a screen fades it in rather than flashing a placeholder.
  Do not re-extract colours locally — the cache is shared and bounded. Null is
  also what the hook returns when the user has turned cover tinting off, so no
  call site needs a branch for the setting.
- **Appearance settings**: the scales a user can move — corner radius
  (`useRadius`) and list density (`useListDensity`) — are read through a hook,
  never imported statically, or the surface silently opts out of the setting
  and the preset reads as half-applied. A round control is the trap here:
  `radius.pill` is for the things whose roundness is what they *are* (an
  avatar, a status dot, a radio fill, a progress track, an artist's photo) and
  stays round at every preset, while a **control** merely drawn as a pill or a
  circle — a play button, a button on a detail bar — uses `rad.pillFor(height)`
  and squares off with the cards under `sharp`. `size / 2` written out as a
  literal is the same mistake in a second spelling. Every one of them falls back in its
  selector rather than reading straight off the persisted settings blob: a user
  upgrading has one written before the key existed, and `undefined` reaches the
  style as a broken layout rather than as a default. Under the `default` option
  each hook returns exactly the number the app used before the setting existed,
  so adding one moves nothing until the user asks it to.
- **Home vs Library**: Home is what changes, Library is what's complete. A view
  that moves on its own — recently added, most played, what you were listening
  to — is a Home shelf; the stable, exhaustive, sortable list is a Library
  collection. The same data may appear in both, but never as the same thing
  twice: Home shows the first handful and its heading leads to Library's full
  version (`SectionShelfHeader`'s `onSeeAll`), landing on the entity list with
  the matching sort already applied.
- **Library entry vs sort order**: an entry row is one of the two things —
  a kind of thing the library holds (playlists, albums, artists, tracks) or a
  cross-cutting cut over them that a sort order can't express (genres, which
  is a hierarchy; downloaded, which is a filter). A time-ordered or play-ordered
  view of albums is not a row: it is the Albums row with a sort. "Recently
  added" would have been a row for the same reason "Most played" would be —
  neither is; both live in the sort sheet, and the changing view of each is
  the Home shelf.
- **Library navigation**: the library tab is an index, each row opening its own
  screen (`screens/library/LibraryCollectionScreen`) — nothing else lives on it.
  It used to be a row of filter pills, which could only ever show the types it
  had room for — that is why genres had no way in for so long. Adding a way to
  browse means adding an entry row, not a pill and not a section. Deep pushes
  from a library row (a genre, a collection screen, an album from one of them)
  keep the Library tab lit — `_layout.tsx` remembers the last tab root you
  visited and holds it until you visit another, so the icon does not jump to
  Home the moment you leave `/library`.
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
  than as an untranslated string. The same test checks the other direction —
  every literal key the code passes to `t()` exists in `en.json` — because a
  string can also go missing by never arriving: seven surfaces (the tab bar,
  the Downloads screen, the display sheet, both Home banners) shipped their
  English inline as a `defaultValue` and were never translated into anything,
  in any locale, which the one-directional check could not see. Put the English
  in `en.json`, not in a `defaultValue`; keep the latter only for a key built at
  runtime, where there is nothing static to check.
- **Home**: sections are grouped into tiers by `features/home/homeLayout` —
  resume first and unlabelled, then your own library, then external discovery
  behind its source header. A new section belongs to exactly one tier, and the
  library tier stays short: it carries what changes on its own, not everything
  that could be shown. Discovery is off by default (`deezerDiscoveryEnabled`)
  and absent offline, so the local tiers are all a fresh install has — Home
  cannot be emptied out on the assumption that discovery will fill it.
