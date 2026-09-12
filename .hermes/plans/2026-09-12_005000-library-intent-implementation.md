# Library-Intent System — Implementation Plan (Phases A–E)

> **For Hermes:** Execute with subagent-driven-development. Delegation is pinned to
> `claude-sonnet-5`. Fresh subagent per task-group with two-stage review (spec
> compliance, then code quality). Parent (opus) orchestrates and verifies; never
> trust a child's exit code — open the diff and re-run the gates.

**Goal:** Evolve Yuzic from parallel "local vs external" entity handling into a
unified entity model with a `LibraryState` field, a capability-slot integration
architecture, a save-only Wants system with an explicit Get action, and
feature-oriented settings — shipping in five independently-mergeable phases,
removing dead/duplicated code as each phase lands.

**Architecture:** One entity shape per kind (Artist/Album/Track) carrying a stable
on-device local id + additive `externalIds` + a `LibraryState`; one shared row +
options component per kind; one `IntegrationModule` contract that servers,
sources, and downloaders converge on; Wants (intent) separated from the existing
acquisition-job machinery; feature-oriented settings pages that reuse the existing
`SettingsScreen` shell.

**Tech stack:** React Native + Expo, TypeScript, expo-router, Redux Toolkit +
redux-persist over MMKV, expo-secure-store (secrets), Jest (unit),
Maestro (e2e). CI gates (branch-protected on `dev` and `master`):
`npm run lint`, `npx tsc --noEmit`, `npx jest --ci`.

**Design source of truth:** `docs/design-library-intent.md` (commit `5330f4ee`).
**API audit:** `.hermes/tmp/yuzic-api-gaps-filled.md` + two recovered partials.

---

## Cross-cutting conventions (apply to every task in every phase)

1. **Branch model.** All work branches off `dev`. One feature branch per phase
   (`feat/li-a-entity-model`, `feat/li-b-modules`, …). PR per phase → `dev`,
   Zack reviews/merges (never auto-merge app PRs, never touch `master`, never
   bump `package.json` version — that ships a release).
2. **TDD.** Every code task: write the failing test → run it red → minimal
   implementation → run it green → commit. Jest for logic/reducers/hooks;
   component tests where a render contract matters.
3. **CI gates are the definition of done for a task-group.** `npm run lint`,
   `npx tsc --noEmit`, `npx jest --ci` all green before commit. Lint baseline is
   0 errors / 52 pre-existing warnings — do not increase either.
4. **UI conventions (from AGENTS.md) are acceptance criteria**, not
   nice-to-haves: scales from `constants/design` (no literal fontSize/borderRadius),
   `components/Touchable` not `TouchableOpacity`, `a11y.*` labels on textless
   controls, all four locales updated in the same change any `en.json` key is
   added, `spacing.scrollClearance` on scrolling lists, skeleton-vs-spinner rule.
5. **Docs in the same change.** Any integration/endpoint/capability change updates
   `docs/integrations.md`; any load-bearing pattern updates `docs/architecture.md`;
   headline product/support changes update `README.md`. Per repo AGENTS.md.
6. **Cleanup is folded in, not deferred.** When a task supersedes a path, it
   deletes the old path in the same task after migration — no "remove later"
   TODOs. Each phase ends with a dead-code sweep (§ per phase) verified by
   `tsc --noEmit` (no unreferenced exports left dangling) and a grep for the
   removed symbols returning empty.
7. **Subagent delegation.** Self-contained task-groups (a reducer + its tests, a
   component collapse, a settings page) go to a Sonnet subagent with: exact files,
   the failing-test-first instruction, the completion command list, and the
   "do not change X" constraints. Parent verifies artifact + re-runs gates from a
   clean state before accepting. Independent task-groups dispatched as separate
   calls (not one fan-out) so one failure can't discard a sibling's good work.
8. **Per-server scope preserved.** No global Wants, no cross-server unified
   library this arc. Connection/feature settings inherit the active-server context
   — no redundant server pickers.

## Planning granularity (deliberate)

Phase A is expanded to bite-size TDD tasks below (it's next to build). Phases B–E
are specified as concrete, file-named task-groups with explicit acceptance, **not**
pre-exploded into literal 2–5-min steps — because each depends on the merged
shape of the prior phase, and exploding E now would encode guesses. **At the start
of each phase, expand that phase to bite-size tasks against the real merged tree**
(re-run targeted recon if the tree moved). This is a chosen checkpoint structure,
not a missing detail.

---

# Phase A — Unified entity model

**Depends on:** nothing. **Branch:** `feat/li-a-entity-model`.

**Objective:** One entity shape per kind with a stable local id, additive
`externalIds`, and a `LibraryState`; one shared row + options per kind; collapse
the Album/Song external duplicates. This is the precondition for B–E.

### Verified current state (from recon, spot-checked)
- Types: `src/types/Artist.ts` (`Artist` bare `mbid?` vs `ExternalArtist`
  nested `externalIds.mbid`), `src/types/Album.ts` (`Album` embeds `artist` as an
  **object**; `ExternalAlbum` flattens `artist` to a **string**; shared
  `ExternalIds` bag), `src/types/Song.ts` (`Song` has **no** mbid/externalIds;
  `ExternalSong` does).
- Duplicated pairs to collapse: `components/rows/AlbumRow` vs `ExternalAlbumRow`
  (+ its `Loading.tsx`); `components/rows/SongRow` vs `ExternalSongRow`;
  `components/options/AlbumOptions` vs `ExternalAlbumOptions`;
  `components/options/SongOptions` vs `ExternalSongOptions`;
  `screens/album/components/Content/LocalAlbumBody` vs `ExternalAlbumBody`
  (switched in `Content/index.tsx`); `screens/album/index.tsx` chooses
  `useAlbum` vs `useExternalAlbum` via `matchAlbumToLibrary`.
- Artist has **no** external row/options pair (asymmetric — only screen sections
  `PopularOnDeezerSection.tsx` + hooks). Playlist has no external variant.
- Shared low-level renderer already exists: `src/components/MediaListRow.tsx`.
- Matching already factored out: `src/hooks/libraryMatch.ts`
  (`matchAlbumToLibrary`/`matchArtistToLibrary`, mbid-first then normalized
  string via `src/utils/normalize.ts`); `src/hooks/externalAlbumMatch.ts`
  (`matchesQueuedRelease`); `src/hooks/useExternalAlbumStatus.ts` computes an
  in_library/downloading/none status by polling — the closest precedent to
  `LibraryState`, but hook-computed, not a field.
- Identity today = the connected server's own item id (assigned in
  `src/api/<server>/**`); no on-device id yet.

### Task groups

**A1 — `LibraryState` type + stable local id (foundation, no UI).**
- Create `src/types/LibraryState.ts`: `export type LibraryState =
  'in-library' | 'wanted' | 'acquirable' | 'external'`.
- Create `src/types/EntityId.ts`: a `LocalId` branded type + `makeLocalId()`
  (deterministic from `{kind, sourceServerId, serverItemId}` for
  server-originated entities; from `{kind, externalSource, externalNativeId}` for
  external-originated) so the same entity resolves to a stable id without a
  network call. **Not** a normalized-metadata string.
- Test `src/types/__tests__/EntityId.test.ts`: same inputs → same id; different
  server → different id; external + local for the same released album produce
  ids that `libraryMatch` can still relate (id is identity, match is separate).
- TDD each. Commit.

**A2 — Reconcile the three entity shapes.**
- Unify `Album.artist` to one representation (recon flags the object-vs-string
  mismatch as the structural blocker). Decision for the plan: **embedded
  `ArtistRef { localId, name, cover?, externalIds? }`** — external albums populate
  it from their flattened string + `artistMbid`. Add `localId`, `externalIds`,
  `libraryState` to `Album`, `Artist`, and (net-new) `Song`.
- Migrate `ExternalAlbum`/`ExternalSong`/`ExternalArtist` to be *the same shape*
  with `libraryState: 'external'` — keep a thin type alias temporarily so call
  sites compile, then remove aliases in A6.
- Update the per-server adapters under `src/api/<server>/**` that construct these
  (populate `localId` via `makeLocalId`, keep copying server MBID tags into
  `externalIds.mbid`). Recon-named: `navidrome/albums/getAlbum.ts`,
  `navidrome/albums/getAlbumInfo.ts`, `mediaBrowser/albums/getAlbum.ts`,
  `mediaBrowser/search/search.ts`, etc.
- Tests: adapter output carries `localId` + `libraryState:'in-library'`; external
  fetchers carry `libraryState:'external'`. Update existing adapter tests.
- Commit per adapter family (navidrome, mediaBrowser, plex, local).

**A3 — `LibraryState` as a derived-but-stored field.**
- Promote `useExternalAlbumStatus`'s logic into a shared resolver
  `src/features/library/resolveLibraryState.ts` that, given an entity +
  `libraryMatch` + Wants store (Phase C fills the wanted branch; here it returns
  in-library/acquirable/external only), returns a `LibraryState`. Keep it a hook
  `useLibraryState(entity)` for row consumption.
- Test the resolver's state transitions with fixtures.
- Commit.

**A4 — One shared row per kind.**
- Extend `AlbumRow`/`SongRow`/`ArtistRow` to render any `LibraryState` off the one
  entity shape, driving the badge/trailing affordance from `useLibraryState` and
  `MediaListRow`'s existing slots. Only the primary action differs by state.
- Delete `ExternalAlbumRow/` (+ `Loading.tsx`) and `ExternalSongRow/`; repoint
  imports. Keep `TopTrackRow` (variant, not a duplicate).
- Component tests: one row renders correct badge + primary action per state.
- Commit.

**A5 — One shared options sheet per kind.**
- Merge `ExternalAlbumOptions`→`AlbumOptions`, `ExternalSongOptions`→`SongOptions`
  (action set switches on `libraryState`; the Want/Get actions are stubbed here,
  fully wired in Phase C — for now external keeps its current download entry point
  so nothing regresses). Delete the External* options files, repoint imports.
- **Guard:** `SongOptions` already imports `generateSimilarPlaylist` — preserve
  that wiring untouched (Phase E generalizes it).
- Tests + commit.

**A6 — Collapse the album screen split + retire aliases.**
- Merge `LocalAlbumBody`/`ExternalAlbumBody` into one `AlbumBody` driven by
  `libraryState`; simplify `screens/album/components/Content/index.tsx` and
  `screens/album/index.tsx` (one `useAlbum` that carries state; keep the
  external-fetch path as a data source, not a separate screen).
- Remove the temporary type aliases from A2. `tsc --noEmit` proves nothing
  dangles.
- Tests + commit.

**A7 — Phase-A dead-code sweep.**
- Grep-verify removed symbols return empty: `ExternalAlbumRow`, `ExternalSongRow`,
  `ExternalAlbumOptions`, `ExternalSongOptions`, `ExternalAlbumBody`,
  `LocalAlbumBody`. Remove now-unused hooks if fully superseded
  (`useExternalAlbumStatus` → folded into `resolveLibraryState`; keep
  `useExternalAlbum`/`useExternalArtist` fetchers — still the data source).
- Update `docs/architecture.md` (entity model + `LibraryState` + local id seam).
- Full gates green. Open PR `feat/li-a-entity-model` → `dev`.

**Phase-A open spike (build-time, from the design doc):** whether `MatchKey`
needs duration or artist+title(+album) suffices against a large real library —
test against Zack's dev server library during A3.

---

# Phase B — `IntegrationModule` contract + Connections + secure storage

**Depends on:** A (soft). **Branch:** `feat/li-b-modules`.

**Objective:** Converge the three registry shapes onto one `IntegrationModule`
contract; generate a single **Connections** screen; migrate credentials to the
keystore.

### Verified current state
- `src/features/sources/registry.ts` — `SourceDefinition` (deezer, musicbrainz;
  resolve/fetch methods; enabled = a redux boolean, no auth/testConnection).
- `src/features/downloaders/registry.ts` — `DownloaderDefinition` (lidarr, slskd,
  soulsync; optional `downloadAlbum?`/`downloadTrack?`/`fetchQueueWithDiff`;
  `settingsRoute`) + `useDownloaderStates()` joining redux connection state. Closest
  analogue to the target contract. Siblings: `registry.test.tsx`, `errorKeys.ts`.
- `src/api/types.ts` — `ApiAdapter` with optional capability fields (radio?,
  discovery?, queue?, …) — the exact presence-check pattern to generalize; its
  `AuthApi.connect/ping/testUrl/disconnect` is the `testConnection` analogue but
  per-server.
- Per-service settings screens under `src/screens/settings/integrations/*` and
  router leaves under `src/app/.../settings/*View.tsx`; `_layout.tsx` registers
  every route (must change in lockstep).
- **Two parallel hubs today:** Integrations (deezer/musicbrainz/lastfm/
  listenbrainz/audiomuse) vs Downloaders (lidarr/slskd/soulsync) — Connections
  merges them, keyed by capability.
- Credentials: MMKV via redux-persist for all API keys/tokens
  (`downloadersSlice`, `audiomuseSlice`, `listenbrainzSlice`); only mTLS certs use
  `expo-secure-store` (`src/features/mtls/clientCertificateStore.ts`, the pattern
  to copy).

### Task groups
- **B1** — Define `src/features/integrations/types.ts`: `IntegrationModule`,
  `CapabilitySlot` (the §4 slot list incl. `playlist.generate`, `metadata.enrich`),
  `SlotImpl`, `AuthDescriptor` (`'none'|'apiKey'|'account'`), `OptionsDescriptor`
  (schema-driven knobs), `Health`. TDD the type-level + a `describeModule()` helper.
- **B2** — Adapt `DownloaderDefinition` entries into `IntegrationModule`s (add
  `auth`, `slots: {acquisition.track/album}`, `testConnection`). Find a home for
  `fetchQueueWithDiff` (downloader-specific extension on the module, or its own
  non-slot field — decide at phase start). Keep behavior identical; tests port from
  `registry.test.tsx`.
- **B3** — Adapt `SourceDefinition` entries (deezer/musicbrainz) into modules
  filling `resolution` / `discovery.shelf`. Enabled-boolean becomes module
  connection state.
- **B4** — Decide server adapters' relationship to modules (recon open question):
  keep `ApiAdapter` as its own concern but expose its capabilities to the slot
  registry so `similarity.songs`/`scrobble`/`lyrics` resolve uniformly. Document in
  `architecture.md`.
- **B5** — `SecureCredentialStore` generalizing `clientCertificateStore.ts` to all
  API keys/tokens; one-time migration on upgrade from MMKV→keystore, transparent.
  Tests for migration idempotency. Old redux-persisted secret fields removed after
  migration.
- **B6** — Generated **Connections** screen from the module registry (account/
  endpoint, health, features-using, data-sent line, reconnect, disconnect). Merge
  the two hubs. Update `settings/_layout.tsx` routes in lockstep; keep deep links.
- **B7** — Dead-code sweep: remove the old `SourceDefinition`/`DownloaderDefinition`
  types once callers migrated; delete superseded per-service credential plumbing.
  Update `docs/integrations.md` + `docs/architecture.md`. PR → `dev`.

---

# Phase C — Wants (save-only) + Get + unified Downloads screen

**Depends on:** A, B. **Branch:** `feat/li-c-wants-get`.

**Objective:** Declarative save-only Wants; explicit Get with a compact review;
arrival verified against the library index; one Downloads screen (Offline +
Downloaders, all-activity).

### Verified current state
- `src/components/options/DownloadSheet.tsx` — the *entire* Get today: imperative,
  fire-and-forget `def.downloadAlbum/downloadTrack`, toast, no persisted intent, no
  review, no target picker. 4 call sites (ExternalAlbumOptions/ExternalSongOptions/
  playlist RecommendedSection/album Header — note first two collapse in A5).
- `src/features/downloaders/DownloadersQueueContext.tsx` — single 30s poller;
  completion = "item vanished from queue" → `startScan()` + staggered
  `useSync().sync(true)` at [15s,60s]. This is the arrival gap: disappearance ≠
  library-has-it.
- Per-provider queues: `src/api/lidarr/queue/index.ts`, `src/api/slskd/queue/`,
  `src/api/soulsync/downloads/index.ts` (no soulsync/queue path). Same
  fetch/detect/cancel shape.
- Offline (on-device) system is `src/contexts/DownloadContext.tsx` (977 lines,
  Actions/State/Progress split, expo-file-system, `jobQueue.ts`), surfaced at
  `screens/settings/library/DownloadsInfoScreen.tsx`. **`src/offline/` is
  unrelated** (mutation replayer).
- Screens: `src/screens/downloads/DownloadsScreen.tsx` (downloaders only, SoulSync
  omitted); `DownloadsInfoScreen` (offline). Redundant second poll in
  `src/screens/settings/downloaders/useDownloaderQueue.ts` (10s) to collapse.

### Task groups
- **C1** — `wantsSlice` (Redux, MMKV-persisted, per-server): `Want { localId,
  externalIds, unit, origin, jobRef?, createdAt/updatedAt }`. Add/remove/list
  reducers. **Save makes zero network calls.** TDD reducers.
- **C2** — Wire `libraryState:'wanted'` into `resolveLibraryState` (A3) reading
  `wantsSlice`. Want and Get become the two primary actions on unavailable
  entities in the collapsed options sheets (A5). Manual Add bottom sheet
  (Track/Album, title, artist; local save, no lookup).
- **C3** — Get router `src/features/acquisition/getRouter.ts`: one capable
  provider → dispatch; multiple → compact **Get-review** sheet (provider, target
  server, match/candidate state, quick overrides; **per-track and per-album
  default selectors**; overrides request-only unless saved). Ambiguous → ask when
  provider exposes candidates; explain service-managed matching honestly. Failure →
  `needs-attention` linked to the **same** job. Replaces `DownloadSheet`.
  **Includes the Lidarr quality-profile knob** (default in Downloaders settings +
  per-Get override — reads `/qualityprofile`, per the design + audit).
- **C4** — Arrival verification: new `src/features/acquisition/arrival.ts` that
  matches a want against the library index (via `libraryMatch` over synced
  `librarySlice`) as the completion signal, replacing queue-disappearance.
  `DownloadersQueueContext` keeps running the poll+startScan+staggered-sync (still
  needed to *cause* the rescan); only the "is it done" signal moves. Fulfilled want
  leaves the active list with brief feedback; no Arrived collection.
- **C5** — One **Downloads screen**: merge `DownloadsScreen` (Downloaders section,
  all providers incl. SoulSync, all-activity incl. externally-started jobs, only
  provider-supported controls) + offline view (Offline section from
  `DownloadContext`). Collapse the redundant `useDownloaderQueue` poll onto the
  shared context. Wants list lives alongside in Library.
- **C6** — Dead-code sweep: delete `DownloadSheet.tsx`; remove the second poll
  loop; delete the now-split settings Downloads-info duplication if fully absorbed.
  Docs. PR → `dev`.

---

# Phase D — Feature-oriented settings surfaces

**Depends on:** B. **Branch:** `feat/li-d-feature-settings`.

**Objective:** Scrobbling, Lyrics, Metadata, Search feature pages; template is the
existing `src/screens/settings/home/index.tsx` (already pulls effect-oriented
toggles out of integration screens — the proven precedent).

### Verified current state
- Settings IA: `SettingsScreen` shell + `SettingsCard/Row/ToggleGroup/AuthCard`
  primitives in `src/screens/settings/components/`; route leaves flat under
  `app/.../settings/*View.tsx`; `settings/home/index.tsx` is the feature-page
  precedent.
- Scrobbling: `src/hooks/useScrobbling.ts` routes server-dest (ApiAdapter
  `songs.scrobble` — this is how Last.fm happens today, server-forwarded) vs
  ListenBrainz-dest (`src/api/listenbrainz/scrobble.ts`); toggles split
  (`serverScrobbleEnabled` **not surfaced in any settings screen** — verify/ maybe
  dead; ListenBrainz toggle embedded in its integration screen). Offline queue via
  `offlineMutations.ts` (`ScrobbleDestination='server'|'listenbrainz'`).
- Lyrics: server-embedded only, per-adapter `lyrics/getLyricsBySongId.ts`; UI
  `LyricsBottomSheet`/`LyricsPreviewCard`. **No lyrics settings screen, no LRCLIB**
  (net-new).
- Metadata/artwork: scattered — artist bio from Deezer/external in
  `screens/artist/components/Content/BioSection.tsx`; Last.fm read-only
  (`src/api/lastfm/`); `useCoverAccent` (tinting, not enrichment). **No unified
  Metadata page** (net-new).
- Search: `src/screens/search/index.tsx` + `SearchContext` — one flat query, local
  + Deezer-only external appended below. **No segmented scope, no source filter, no
  Search settings screen** (net-new).

### Task groups
- **D1 — Scrobbling page.** One route per destination per server (Disabled /
  Through-server / Direct). **LB-direct ships now** (token-only). **Last.fm-direct
  is sequenced out** — offer Disabled/Through-server for Last.fm, no signed-session
  build this cut (design decision). Consolidate the split toggles; confirm/remove
  the possibly-dead `serverScrobbleEnabled` surfacing.
- **D2 — Lyrics page + LRCLIB.** Server-embedded first, then user-ordered fallback
  chain (reorder/disable). New `src/api/lrclib/` module (`'none'`-tier, no key)
  filling the `lyrics` slot; **one source, synced-preferred internally**. New
  Lyrics settings screen + route.
- **D3 — Metadata page.** Independent Artist-info + Artwork controls, **each its
  own fallback order** (Jellyfin-style), display-only, gaps-only, never writes
  server tags, restores server view on disable, small unobtrusive source line (no
  per-item badges). Launch sources: artist-info = Last.fm `artist.getInfo`;
  artwork = Deezer + Cover Art Archive. New `metadata.enrich` slot impls.
- **D4 — Search page + segmented scope.** Segmented `Your Library` (default) /
  `Other sources` with a Filters source selector (sources enabled *for search*,
  independent of Home). Merge confident cross-source matches with provenance; keep
  editions/ambiguous separate. New Search settings screen.
- **D5 — Dead-code sweep + docs.** Remove toggles relocated out of integration
  screens; `docs/integrations.md` (LRCLIB, Last.fm/Deezer/CAA enrichment). PR → `dev`.

---

# Phase E — Discovery + provider-generated playlists

**Depends on:** B (C for want/Get taps). **Branch:** `feat/li-e-discovery`.

**Objective:** ListenBrainz `createdfor` mixes as external Home shelves;
`playlist.generate` generalized from the existing AudioMuse code; local-first Home
mix from existing capabilities.

### Verified current state
- Home: `src/features/home/homeLayout.ts` tiers (resume/library/discovery);
  `useDailyLayout.ts` assembles config; `screens/home/Explore.tsx` is the shelf
  renderer (switch on section type; `SourceGroup` wraps external shelves with
  headers gated by `showSourceHeaders`); discovery shelves are per-type components.
- `settings/home/index.tsx` toggles server-sections / LB-discovery /
  Deezer-discovery — the page to extend with createdfor-mix toggles.
- **`playlist.generate` is ~half-built:** `src/features/audiomuse/generatePlaylist.ts`
  (`generateSimilarPlaylist` — calls AudioMuse, creates a server playlist, adds
  seed+similar) is already wired into `SongOptions.tsx` (gated on
  `selectIsAudiomuseConfigured`). This phase generalizes it into the slot + extends
  the gesture to album/artist — **not** a from-scratch build.
- LB scrobble/similar clients exist (`src/api/listenbrainz/`); createdfor endpoint
  is net-new to call.

### Task groups
- **E1 — `playlist.generate` slot.** Lift `generateSimilarPlaylist` behind a
  `playlist.generate` `SlotImpl` (AudioMuse fills it). Keep server-materialization
  (provider writes the playlist; no Yuzic-local store). Extend the "Make a playlist
  from this" gesture to album/artist entities (track already works). **Track/entity
  seeds only — mood-centroid deferred.** Gesture hidden when no provider fills the
  slot.
- **E2 — ListenBrainz createdfor shelves.** New client for
  `/1/user/{user}/playlists/createdfor` (public). Render daily-jams/weekly-jams/
  weekly-exploration as **standalone named external shelves** in `Explore.tsx`'s
  discovery tier, under one compact LB header (hybrid-provenance rule). Toggle in
  `settings/home`. Unowned tracks → one-tap Want/Get (needs C). **Raw CF endpoint
  not built** (deferred).
- **E3 — Local-first Home mix** from existing play-stats/genres + `getSimilarSongs2`
  server similarity; no new generic mix-generator algorithm.
- **E4 — Onboarding discovery prompt** (one intentional opt-in, shows exactly what
  gets sent).
- **E5 — Dead-code sweep + docs.** Deezer/MusicBrainz deepening stays parked
  (draw-on-demand). `docs/integrations.md` (createdfor, playlist.generate). PR → `dev`.

---

## Risks, tradeoffs, open questions

- **Entity-shape reconciliation (A2) is the riskiest change** — `Album.artist`
  object-vs-string touches every adapter and many screens. Mitigation: the
  temporary type-alias bridge (A2→A6) keeps the tree compiling through the
  migration; per-adapter commits keep blast radius reviewable.
- **`fetchQueueWithDiff` doesn't map to a clean slot (B2)** — decide at Phase B
  start whether it's a downloader-specific module extension or a non-slot field.
- **`serverScrobbleEnabled` may be dead UI (D1)** — confirm before building the
  Scrobbling page; if unreachable, the page *is* its first real surface.
- **Arrival verification (C4)** must not remove the rescan trigger — only the
  completion *signal* moves from queue-disappearance to library-index match.
- **`MatchKey` duration question (A3)** — resolve against a large real library
  (Zack's dev server) during Phase A.
- **Live-instance API unknowns** (request bodies, per-route roles) from the audit's
  "still unknown" lists — close against real instances when a task first needs them.

## Execution handoff

Plan complete. Execution model: one phase at a time, each phase expanded to
bite-size TDD tasks at its start, self-contained task-groups delegated to
`claude-sonnet-5` subagents with two-stage review, parent re-runs gates from clean
state before accepting, PR per phase to `dev` for Zack to merge. Phase A is
already task-broken above and is the immediate next build.
