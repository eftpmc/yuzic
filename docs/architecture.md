# Architecture

How the app is built. For *what* it supports — the servers, integrations, and
downloaders, and every outside endpoint the app calls — see
[integrations.md](integrations.md).

Four load-bearing patterns hold the app together. Everything else is a leaf on
one of these trunks.

## 1. `ApiAdapter` — optional feature capabilities

Every server yuzic supports (Navidrome, Jellyfin, Emby, Plex, and local files)
implements one `ApiAdapter` from `src/api/types.ts`. The base surface (auth,
albums, artists, genres, playlists, starred, songs, tracks, similar, lyrics,
search) is required.
Anything a provider-specific feature reaches for is an **optional** field:

```ts
export interface ApiAdapter {
  auth: AuthApi;
  albums: AlbumsApi;
  // …required base…

  radio?: RadioApi;         // Subsonic (Navidrome) only today
  shares?: SharesApi;       // Subsonic only today
  bookmarks?: BookmarksApi; // Subsonic + mediaBrowser via PlaybackPositionTicks
  queue?: QueueApi;         // Subsonic only
  discovery?: DiscoveryApi; // getRandomSongs + getNowPlaying (Subsonic)
  podcasts?: PodcastsApi;   // Subsonic only
  jukebox?: JukeboxApi;     // Subsonic only — see the note on probing below
}
```

**Presence is not always permission.** `jukebox` is the case that shows the
limit of presence-gating: every Navidrome adapter has it, but Navidrome ships
the feature off (`Jukebox.Enabled`) and, once on, grants it per user. A server
with it disabled doesn't even answer in Subsonic's error shape —
demo.navidrome.org replies with prose. So the output picker asks
(`useJukeboxAvailability` → one `status()` call) and treats any failure as a
no. Presence decides whether the app *can* ask; the server decides the answer.

A capability that isn't a whole surface is declared as a field on the surface
that owns it, and read the same way:

- `songs.streamableCodecs` — the Opus switch on Playback appears where the
  adapter says Opus is streamable, not where the server is a Jellyfin.
- `songs.scrobbleKind` — `'scrobble'` where the call is a listen the server may
  forward onward, `'markPlayed'` where it only moves a play count. The Server
  screen words its one switch from this instead of asking who the server is.

`api/capabilities.test.ts` pins what each adapter declares, because these are
read by screens that no longer have any other way to find out.

**Callers check for existence, not provider name.** The Library tab does
`if (api.radio) show Radio row`. If Plex adopts an equivalent tomorrow, its
adapter fills in `radio`, and the row appears for Plex users without any
code change downstream.

Same rule for methods on required surfaces that some providers can't back:
`similar.getSimilarArtists?`, `artists.getTopSongs?`, `songs.reportPlaybackStart?`,
etc.

**Never gate on `activeServer.type`.** That couples UI to provider identity and
grows a `if/else` ladder every time another server joins. Presence-gating stays
open-ended.

### One adapter per protocol, not per product

`api/mediaBrowser/adapter.ts` backs both Jellyfin and Emby: they speak the same
MediaBrowser-derived API and differ only in what `MediaBrowserBrand` captures —
the stream token param, whether `/System/Ping` returns JSON, and how a cover is
addressed. `api/jellyfin/index.ts` and `api/emby/index.ts` are three-line brand
bindings over it.

They were two full adapter files, identical but for the brand constant, and had
already started to drift; `adapter.test.ts` now asserts the two surfaces match
so a change can't reach only one. A server whose API is genuinely different —
Plex — gets its own adapter rather than a third brand.

### Building a new provider adapter

Implement the base surface first. Add optional surfaces only when the server
exposes the shape natively — don't approximate. If a server has a partial
version of a feature (e.g. Jellyfin's `PlaybackPositionTicks` is a per-item
resume position, not a dedicated bookmarks table), the adapter is where the
translation lives. See `api/mediaBrowser/bookmarks/bookmarks.ts` for how the
Jellyfin/Emby bookmarks are dressed up as Subsonic-style `Bookmark[]`.

### Local files are a provider, not an offline special case

`local` is a normal `ServerType` and `src/api/local/` returns a normal adapter.
Onboarding creates one local server record with the display-only URL
`local://device`, then the import screen uses the platform document picker and
copies approved files into Yuzic's private documents directory. The index keeps
only compact tag-derived catalog data and the private file URI in MMKV; it does
not request broad media-library permission or expose a device-wide scan.

This keeps every catalog, search, playlists, starred, and player consumer on
the same adapter path. `file://` is returned by `songs.buildStreamUrl`; no
active-server exception is allowed elsewhere. A local library is intentionally
device-local: it is not a server sync or a replacement for offline downloads
from another server.

### Provider code authorization and installation identity

Provider configuration may expose an optional `codeAuth` lifecycle
(`begin → display code → poll → complete`). The credentials screen only asks
whether that capability exists; Jellyfin Quick Connect and Plex PIN sign-in are
provider implementations, not `ServerType` branches in the UI.

`utils/installationId.ts` persists one random ID under
`app.installationId.v1`. It is used for MediaBrowser's client identity and
Plex's `X-Plex-Client-Identifier`; it must remain stable across launches and
must never be the old shared literal `yuzic-device`.

## 2. `playbackSlice` — the source of truth for playback state

`src/utils/redux/slices/playbackSlice.ts` is what makes "the app remembers what
I was doing" true on every provider, not just Navidrome. It carries:

- `queueSongIds[]`, `currentIndex`, `positionMs`
- `repeatMode`, `shuffleMode`
- `activeServerId` — the server whose id namespace the queue belongs to;
  changing servers invalidates the slice
- `bookmarks: Record<songId, { positionMs, updatedAt }>` — per-track resume
  positions for long-form content and podcasts

`usePlaybackPersistence` (in `hooks/`) writes to this slice from PlayingContext
on every meaningful change. `useQueueSync` and `useBookmarkManager` are
**mirror layers** on top: they push local state to the server when the adapter
supports it (`api.queue`, `api.bookmarks`) and seed the local state on connect.
They never own state.

`ResumeQueueBanner` (Home) is the fallback for fresh installs — appears only
when local is empty AND the server has a queue to offer.

**Why this shape**: server-first would have meant Jellyfin/Emby users lose the
queue on every kill, since neither exposes a Subsonic-style play-queue API.
Bookmarks are the mirror of the same story: Navidrome has an explicit endpoint,
Jellyfin has the same information as `PlaybackPositionTicks` on items. Both
back the same local map.

### Adding a new persisted playback dimension

Add the field to `PlaybackState`, an action + reducer, a selector in
`playbackSelectors.ts`, and (if you want it in the "write on state change"
loop) a call in `PlayingContext` at the site the value changes. The persister
already covers the throttling for hot-path fields — model position, not add
another one.

### Sinks — where the audio comes out

`features/player/playbackSink.ts` names the three outputs, and one distinction
runs through all of them: **does the local player still run?**

- `local` — the local player plays and keeps the clock.
- `dlna` — the local player *still* plays, muted (`setVolume(0)`), because a
  DLNA renderer reports no position back; it keeps the clock and drives the
  queue while the same stream URL goes to the renderer. Transport is
  **mirrored**.
- `jukebox` — the server holds the audio and reports its own position. Nothing
  streams to the phone. Transport is **replaced**, and the progress bar reads
  the server's polled position instead of the player's.

`ownsPlayback(sink)` is that question, and every transport call in
`PlayingContext` asks it before touching the player. Getting it wrong for the
jukebox means the phone plays the track a second time, out loud, next to the
server already playing it.

## The player, and the seam it sits behind

`features/player/backend.ts` defines `PlayerBackend` — the surface the app
actually uses, derived from its own call sites rather than from anyone's idea
of a complete player. `createEngineBackend` (yuzic-engine) implements it,
`activeBackend.ts` hands it out, and `PlayingContext` never imports a player
directly.

The seam was built while `@rntp/player` was still here, so both could run on
one device and be compared. That is what turned the removal from a rewrite of
~40 call sites into a swap of one factory function, and it is worth keeping
now that one implementation is left: it is what every test in that directory
fakes, and the engine does not run on web.

Three things about it are not obvious:

- **The engine's answers cross a bridge, and the call sites are synchronous.**
  Call sites read `Math.floor(getProgress().position)` inline, so
  `createEngineBackend` keeps a shadow of what the engine last reported and
  answers from it. A `getProgress` straight after a `seekTo` returns the
  pre-seek position until the next event.
- **Playing-ness is an event, not a getter.** The engine reports it on the
  `playing` field of its state event, which is optional — absent means "cannot
  say", and `usePlayerState.ts` guards rather than coerces, because treating
  absent as false would stop the button ever showing as playing.
- **Commands return void.** They are fire-and-forget: `play()` on a button
  press, `seekTo()` on a scrub. Failures arrive as an error event, and
  `fire()` warns as well as emitting, because in a release build nothing
  subscribes to that event.

`@rntp/player` was removed in full — package, lockfile, patch and all. It was
proprietary from v5 (non-commercial, with a non-compete clause), which is a
probable GPL-3 conflict for yuzic and a definite F-Droid blocker.

The engine is complete on iOS. On Android it is missing nine of the methods
the app calls; they reject by name rather than throwing `is not a function`,
and `setCrossfade` there is a stub that records its options and schedules no
overlap, so crossfade is an iOS feature today.

`PlaybackSinkContext` owns which sink is selected and routes transport to it.
This replaced four copies of `if (activeDevice) castX()` in the player and a
three-term negation in the output sheet that decided whether "This device" was
the selected row — every new output had been adding another term to both.

## 3. `contentKind` — routing the player around non-song content

Every `Song` carries an optional `contentKind: 'song' | 'liveStream' | 'podcastEpisode'`
(default `'song'`). The player checks this before drawing UI or dispatching
side-effects:

- `canScrobble(song)` — false for `liveStream` (a radio session isn't a listen)
- `canJumpWithin(song)` — false for `liveStream` (infinite feed, no position)
- `canFillQueueFrom(song)` — true only for `'song'` (radio and podcasts don't
  spawn autoplay recommendations)
- `hasFiniteDuration(song)` — false for `liveStream`, so the progress bar
  hides and the timestamps go with it

Live streams are `Song`-shaped fabrications built by `buildStationSong`; the
title and streamUrl carry meaning, everything else is a placeholder that the
gates above hide.

Podcasts use `buildPodcastSong`. The bookmark manager treats podcastEpisode as
always-bookmarkable, so resume across sessions works for free.

**Why this shape**: radio and podcasts flow through the same player, the same
queue, the same lock-screen notification as songs. A wholesale queue-type
refactor was possible but touched every consumer of the current track. This
router shim gives the same effect with one field and a handful of intent-named
gates.

### Adding a new content kind

Widen the `ContentKind` union in `types/Song.ts`. Add whichever gates it needs
in `utils/playback/contentKind.ts` — the pattern is one function per player
behavior it flips, named for the intent. Callsites read
`if (canScrobble(song))`, not `if (song.contentKind === 'song')`.

## 4. `useSync` — the catalog pipeline

`src/hooks/useSync.ts` is the single library-sync path. It fetches lists
(albums, artists, playlists, tracks, starred, genres) from the active server,
pushes them into a mix of react-query and redux (library slice + libraryStarred
slice), and stamps `lastSyncedAt` when successful. Every "the library is out of
date" path routes through here:

- App start (`HomeScreen` fires `sync()` if `syncOnAppStart` is on)
- App foreground (`HomeLayout` fires `sync()` on `AppState.change → active`)
- Server switch (`HomeLayout` clears library slices and fires `sync()`)
- Post-download completion (`DownloadersQueueContext` fires `sync(true)` twice
  after a rescan nudge)
- Manual pull-to-refresh (Home)

`sync(force?: boolean)` throttles at 30 minutes by default; `force=true`
bypasses it. `syncPlaylists()` refreshes only the playlist list — cheaper for
"user added a song, list needs to reflect it" cases.

**Server-scoped state**. Everything the sync writes is keyed by `activeServerId`
somewhere — album ids, playlist ids, stats. A server switch clears the slices
so ids from server A don't confuse a query against server B.

### Adding a new library-shaped resource

Fetch it inside `sync()` on the phase-1 `Promise.allSettled` block, then
dispatch it into a slice like the others. If it's per-server, key by
`activeServerId`. If the resource has real invalidation cost (e.g. large
payload), gate the fetch behind a stale-time check via `queryClient.fetchQuery`
so a re-sync inside the 30-min window returns the cached value.

## 5. Reachability — offline, and the server being gone

Two different signals, and using the wrong one is the recurring bug:

- **`useIsOffline`** — the device has no network (NetInfo).
- **`useServerUnreachable`** — the device is online but the *music server* is
  not: Tailscale down, server rebooting, DNS moved. NetInfo reports online, so
  nothing offline-related engages on its own and every request instead hangs to
  its own timeout. `ServerReachabilityWatcher` pings while the flag is set and
  clears it on the first success.

`useServerReachable()` in `features/connectivity` is the two of them together,
and is what a surface should ask when the question is "can I call the server".

Three shapes of consumer:

1. **Has a synced fallback** (albums, artists, playlists, tracks, starred) —
   `useOfflineFirstQuery`. It folds both signals in, serves library data when
   the server can't be asked, and returns `degraded` so the screen can say the
   data is local rather than fresh.
2. **Has a local equivalent but isn't a query** — search. See
   `contexts/searchLegs.ts`: the legs are decided before any fetch, and a
   *server* scope falls back to the local index rather than to nothing.
3. **Has no local equivalent** (radio, podcasts, shares, the server-backed Home
   shelves) — gate `enabled` on `useServerReachable()` and render an offline
   empty state. These have nothing to degrade *to*, so the honest answer is to
   say so rather than spin into a load failure.

**A skipped leg is not a failed leg.** Anything that reports both needs two
flags: attempting a request that cannot land, catching the timeout, and calling
it an error is how offline search came to show a red banner over results that
had actually succeeded.

## 6. Entity model — `LibraryState`, `LocalId`, and one row per kind

Every artist/album/track is *one* entity shape carrying a resolution state,
not a `local` type shadowed by a parallel `External` type. This replaced four
duplicated pairs (Album/Song rows, Album/Song options) and two album-screen
bodies' worth of divergence.

- **`LibraryState`** (`types/LibraryState.ts`) —
  `'in-library' | 'wanted' | 'acquirable' | 'external'`. It is a *property* of
  an entity, not a screen it lives on. The same `AlbumRow`/`SongRow` renders
  any state; only the badge and primary action differ.
- **`LocalId`** (`types/EntityId.ts`) — a stable, on-device identity built by
  `makeLocalId()` from *origin* ids (server+item, or externalSource+nativeId),
  **never** from display metadata. Identity is deliberately separate from
  *matching* (`hooks/libraryMatch.ts`, which is mbid-first then normalized
  title/artist): a server-originated and an external-originated record for the
  same album have **different** `LocalId`s and are related by matching, not by
  identity. `localId`/`externalIds`/`libraryState` are additive-optional on the
  entity types, so adapters populate them incrementally without breaking
  construction sites; server adapters stamp them from `client.serverId`
  (guarded — a missing server id yields no id rather than a wrong one).
- **`resolveLibraryState(facts)`** (`features/library/resolveLibraryState.ts`)
  is the *pure* single source of truth for the state — precedence
  in-library > wanted > acquirable > external, fallthrough to `external` (never
  silently claims ownership). `useLibraryState()` assembles the facts.
  `isWanted` is stubbed until the Wants system exists.
- **`useExternalAlbumStatus` still exists on purpose.** `resolveLibraryState`
  answers *which* state; `useExternalAlbumStatus` additionally polls the
  downloader queues for in-flight **download progress %**, which the state enum
  does not carry. The shared rows call it only for external-origin entities
  (it no-ops on a null album), so a plain library row makes no queue calls.
  This is a deliberate split of concerns, not leftover duplication.
- **Two album bodies remain** (`LocalAlbumBody` vs `ExternalAlbumBody`) even
  though the screen is one state-driven screen: external tracks resolve only to
  30s previews with different playback capability, a real behavioural
  difference the row layer already encodes but the list bodies keep explicit.
  Converging them is a deferred, higher-risk option, not an accident.

## 7. Integration modules — one capability-slot contract

Providers (downloaders, external sources) converge on one `IntegrationModule`
contract (`features/integrations/types.ts`) so a feature asks *what a provider
can do*, never *which product it is*.

- **`CapabilitySlot`** — the vocabulary of things a provider can fill
  (`acquisition.track/album`, `resolution`, `similarity.songs/artists`,
  `discovery.shelf`, `playlist.generate`, `lyrics`, `scrobble`,
  `metadata.enrich`, `preview`). **`IntegrationModule`** = `{ id, label, auth,
  slots: Partial<Record<CapabilitySlot, SlotImpl>>, options?, testConnection }`.
  `slots` is partial for the same reason `ApiAdapter` fields are optional —
  callers presence-check the capability, never the provider name.
- **`SlotImpl` is intentionally `unknown`** for now: typing every slot's method
  signature would couple the contract to providers that don't exist yet. Each
  slot gains a concrete impl type when it's actually built.
- **Existing registries were extended, not rewritten.** `DownloaderDefinition`
  and `SourceDefinition` are now `IntegrationModule & { …operational fields }`
  (their `id` re-narrowed to the closed union). Downloaders are `apiKey`-tier and
  fill `acquisition.*`; sources are `none`-tier (keyless public APIs; a trivial
  `{ok:true}` testConnection — enablement is a user setting, not a connection)
  and fill `resolution` + `discovery.shelf`. A downloader's `fetchQueueWithDiff`
  deliberately maps to **no** slot — it's operational progress reporting, not a
  product capability.
- **Server adapters stay their own concern.** An `ApiAdapter` is required core,
  not an optional integration, so it does **not** become an `IntegrationModule`.
  Instead `serverAdapterSlots()` (`features/integrations/capabilityRegistry.ts`)
  surfaces its capabilities into the same slot vocabulary, and
  `useSlotProviders(slot)` answers "who fills this right now?" across the active
  server **and** connected modules — read-only availability; blend/select/
  fallback policy stays with the calling feature.
- **One Connections screen** (`screens/settings/connections/`) is generated from
  the provider list and replaced the two separate Integrations/Downloaders hubs.
  Per-provider detail screens and their deep-link routes are unchanged.

## 8. Wants and Get — intent is not acquisition

A **want** is a save-only declaration of intent; **Get** is the separate act of
acquiring. The two are deliberately different code paths.

- **`wantsSlice`** (`utils/redux/slices/wantsSlice.ts`) is per-server, persisted,
  and **pure/save-only** — no reducer performs or triggers acquisition, so a
  wishlist works with zero providers connected. A want carries `localId`,
  `title`/`artist` (so it renders with no lookup), `externalIds`, `unit`,
  `origin`, and an optional `jobRef` it only *references*.
- **`libraryState:'wanted'`** flows through `resolveLibraryState` via
  `useLibraryState` reading `selectIsWanted(localId)` — the resolver stays pure;
  the hook is the only state source.
- **Get** is `GetReviewSheet` (replaced the old fire-and-forget `DownloadSheet`):
  it always opens a compact review (target server, unit-compatible provider
  selection, a "Requesting…" line) and the confirm button is **disabled until a
  provider is chosen**, so a job never starts from a hidden default. A per-unit
  default provider (and, for Lidarr albums, a quality profile) persists **only**
  when the user ticks "save as default"; a per-request override is request-only.
- **Arrival is presence-based, not queue-based.** `findArrivedWants`
  (`features/wants/arrival.ts`) matches wants against the *synced library index*
  (reusing `libraryMatch`), and `useWantArrivalWatcher` removes a fulfilled want
  + toasts once when its entity appears **by any route** (a Get, a manual copy, a
  Bandcamp purchase). It is not gated on `jobRef`. The
  `DownloadersQueueContext` poll still runs untouched — it *causes* the rescan
  that makes arrival observable; only the completion *signal* moved off
  queue-disappearance. There is no "Arrived" collection; Recently Added serves it.
- **One Downloads screen** (`screens/downloads/`) shows on-device **Offline** and
  server-side **Downloaders** as distinct sections (never conflated), the latter
  surfacing all activity a provider reports including jobs started outside yuzic,
  reading the single shared `useDownloadersQueue` poll.

## 9. Feature-oriented settings — configure the goal, not the provider

Settings pages are organized by what the user wants yuzic to *do*, not by which
integration supplies it. `screens/settings/home/` set the precedent (pulling
Home-affecting toggles out of the per-integration screens); Scrobbling, Lyrics,
Metadata, and Search follow it. Each reuses the `SettingsScreen` shell and is a
route leaf registered in `settings/_layout.tsx` with a row on the settings root.

- **Scrobbling** (`screens/settings/scrobbling/`) — exactly one route *per
  destination, per server*: `disabled | through-server | direct`, stored in
  `settingsSlice.scrobbleRoutes[serverId]`. The single enum per destination makes
  "at most one route" structural (no double-scrobble). Defaults are *derived at
  read time* from the pre-existing booleans (`deriveScrobbleRoute`), so no
  migration runs. **Last.fm offers only disabled/through-server** this cut
  (direct needs a signed session — sequenced out). `useScrobbling` routes by the
  enum; a duplicate-risk note shows on `through-server` (yuzic can't verify
  server forwarding).
- **Lyrics** (`screens/settings/lyrics/`, `features/lyrics/resolveLyrics.ts`) —
  server-embedded first, then user-ordered external sources; `resolveLyrics`
  returns the first non-empty result. **LRCLIB** (`api/lrclib/`) is the launch
  external source: `none`-tier, no key, *one* source that prefers synced and
  falls back to plain internally. Off by default → server-only behaviour is
  unchanged until a user enables it.
- **Metadata** (`screens/settings/metadata/`, `features/metadata/`) — independent
  **Artist-information** and **Artwork** controls, each its own ordered
  enabled-source chain (`resolveArtistInfo`, `resolveArtwork`). **Display-only and
  gaps-only**: the resolvers never write to any server and only fill a field the
  server left empty, so disabling instantly restores the server view. Launch
  sources: Last.fm `artist.getInfo`; Deezer artist images + Cover Art Archive
  covers. A small "via X" line, never per-item badges.
- **Search** (`screens/settings/search/`, `contexts/searchLegs.ts`) — a segmented
  **Your Library** (default, no external calls) / **Other sources** scope with a
  Filters sheet for search-enabled sources and entity types. `planSearchLegs`
  picks library **XOR** external by scope, so results are never mixed by default;
  provenance is preserved and editions/ambiguous matches stay separate.
  `searchSourcesEnabled` is independent of Home enablement (legacy
  `deezerSearchEnabled` reconciled at read time, no migration).

## 10. Discovery — local-first, provider mixes, and generated playlists

Home discovery is off by default and layered so the local tier always works
with zero external calls.

Home shelf personalization is additive and tier-safe: `settingsSlice` stores
per-shelf visibility and per-tier ordering, while selectors fall back to the
original visible/order values when a key is absent. `customizeHomeSections`
filters and orders only the sections supplied for one tier, preserving the
resume → library → source-group hierarchy. `homeShelfLength` uses bounded
compact/standard/generous choices, and `sleepTimerPresets` stores bounded quick
add durations; both are surfaced in Home settings and read through defaults.

- **Local-first mix** (`screens/home/components/LocalMixSection`) seeds from
  on-device play-stats/genres (a deterministic daily seed via the existing
  `getDailySeed`/`seededShuffle` — **no new recommendation algorithm**) and
  expands through the server adapter's `api.similar.getSimilarSongs` (server-
  native, includes the user's server plugins). It makes **zero external-service
  calls** and is *not* gated behind the external-discovery toggles — it lives in
  the local/server tier, presence-checked on play history + server similarity.
- **ListenBrainz `createdfor` shelves**
  (`api/listenbrainz/recommendations/getCreatedForPlaylists`,
  `LBCreatedForSection`) fetch the user's daily-jams / weekly-jams /
  weekly-exploration mixes (public endpoint) and render **one standalone shelf
  each** under the compact ListenBrainz `SourceGroup` header — LB built the mix,
  yuzic fetches and renders it (no mix-generator, no new slot; the raw CF
  endpoint is deliberately not built). Off by default; unowned tracks get
  Want/Get for free through the shared `SongRow`.
- **`playlist.generate`** — the "Make a playlist from this" gesture
  (`features/audiomuse/generateFromEntity`) derives a seed from a track, album,
  or artist and calls the existing generator; **AudioMuse builds the playlist on
  the server** (no yuzic-local playlist store). The gesture is gated on
  `useCanGeneratePlaylist`/`useSlotFilled('playlist.generate')` and hidden when
  no provider fills the slot. Track/entity-seeded only (mood-centroid deferred).
- **Onboarding asks once** (`screens/onboarding/discovery`): a single transparent
  opt-in for external discovery (Deezer/ListenBrainz, no accounts, exactly what
  gets sent), guarded by `onboardingDiscoveryPrompted` so it shows once and only
  inside the onboarding flow — existing users never see it.

## Where things live

```
src/api/                — providers + shared surfaces
  types.ts              — the ApiAdapter contract and every optional shape
  navidrome/            — Subsonic client + endpoints
  mediaBrowser/         — shared Jellyfin/Emby endpoints (both adapters
                          re-export these; only auth + brand differ)
  mediaBrowser/adapter.ts — the adapter both brands share
  jellyfin/, emby/      — brand bindings over that adapter (3 lines each)
  plex/                 — Plex JSON adapter, PIN sign-in, direct-part streaming
  local/                — private-file importer, MMKV index, local adapter
  audiomuse/            — the acoustic-similarity service client
  listenbrainz/         — read-only recs client (scrobble is separate)
  lastfm/               — bundled-key read-only client (similar-artists)
  musicbrainz/          — canonical metadata client
  deezer/               — external catalog client (discovery, samples)
  lidarr/, slskd/       — downloader clients

src/contexts/PlayingContext.tsx  — the player. Consumes ApiAdapter,
                                    dispatches into playbackSlice, checks
                                    contentKind before every player-shape
                                    decision. Talks to PlayerBackend, never
                                    to a player package directly.

src/features/player/
  backend.ts            — PlayerBackend: the surface the app uses (§ above)
  createEngineBackend.ts— yuzic-engine behind it, plus the shadow that lets
                          a bridged engine answer synchronous getters
  activeBackend.ts      — builds it, hands it out, one per launch
  mediaItem.ts          — the app's own playable-item type, formerly the
                          player package's
  audioSettings.ts      — crossfade and equalizer shapes, bands and presets
  usePlayerState.ts     — the reactive half: progress, playing, active item
  playbackSink.ts       — where the audio comes out (§ above), a separate
                          question from which player produces it

src/hooks/
  useSync.ts            — the catalog pipeline (§4)
  useScrobbling.ts      — scrobble + now-playing (server-forwarded to
                          Last.fm/LB on Navidrome, session events on
                          Jellyfin/Emby)
  useBookmarkManager.ts — local bookmark map + server mirror
  useQueueSync.ts       — server-mirror for the playback queue
  usePlaybackPersistence.ts — the bridge between PlayingContext and
                          playbackSlice

src/contexts/PlaybackSinkContext.tsx — which output is selected, and where
                                    transport commands go

src/features/           — feature-scoped modules that span providers
  player/playbackSink   — the sink types and `ownsPlayback`
  downloaders/          — Lidarr + slskd registry + the queue provider
  downloads/            — Auto-download watcher
  sources/              — External catalog registry (Deezer, MB)
  home/                 — Home layout (§ the day-key + tiers)
  audiomuse/            — Playlist generation from acoustic seed

src/screens/            — one directory per top-level route
src/utils/redux/        — slices + selectors + store setup
src/utils/playback/     — contentKind + Song-synthesis helpers
```

## The four small unforced rules

- **Optional method + presence check, not provider switch.** Every time a
  feature landed as `if (activeServer.type === 'navidrome')` in a review,
  it got rewritten as `if (api.<feature>)` before merging. What the adapter
  can't express, `utils/servers/registry.ts` does: it holds the per-provider
  facts that aren't API calls — the demo, cover URLs, and `libraryScope`, the
  `auth` key each provider stores its chosen libraries under. `activeServer.type`
  is for naming a server to the user and tagging data with its origin; it is not
  how you decide what the app can do.
- **Local first, server as sink.** State the app can produce locally lives
  locally; server sync is a mirror. Playback state is the canonical example.
- **Toggles for privacy and bandwidth, not for "we couldn't pick a default".**
  Every switch is a decision the user has to make. Undecidable-by-design
  gets a switch; sub-flavors of the same integration don't.
- **The `contentKind` router beats a queue-type refactor.** Radio and podcasts
  flow through one player. Anything that goes wrong on non-song content is a
  gate that hasn't been added yet, not a wholesale rewrite waiting.
