# Architecture

How the app is built. For *what* it supports — the servers, integrations, and
downloaders, and every outside endpoint the app calls — see
[integrations.md](integrations.md).

Four load-bearing patterns hold the app together. Everything else is a leaf on
one of these trunks.

## 1. `ApiAdapter` — optional feature capabilities

Every server yuzic supports (Navidrome, Jellyfin, Emby) implements one
`ApiAdapter` from `src/api/types.ts`. The base surface (auth, albums, artists,
genres, playlists, starred, songs, tracks, similar, lyrics, search) is required.
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
}
```

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

## Where things live

```
src/api/                — providers + shared surfaces
  types.ts              — the ApiAdapter contract and every optional shape
  navidrome/            — Subsonic client + endpoints
  mediaBrowser/         — shared Jellyfin/Emby endpoints (both adapters
                          re-export these; only auth + brand differ)
  mediaBrowser/adapter.ts — the adapter both brands share
  jellyfin/, emby/      — brand bindings over that adapter (3 lines each)
  audiomuse/            — the acoustic-similarity service client
  listenbrainz/         — read-only recs client (scrobble is separate)
  lastfm/               — bundled-key read-only client (similar-artists)
  musicbrainz/          — canonical metadata client
  deezer/               — external catalog client (discovery, samples)
  lidarr/, slskd/       — downloader clients

src/contexts/PlayingContext.tsx  — the player. Consumes ApiAdapter,
                                    dispatches into playbackSlice, checks
                                    contentKind before every player-shape
                                    decision.

src/hooks/
  useSync.ts            — the catalog pipeline (§4)
  useScrobbling.ts      — scrobble + now-playing (server-forwarded to
                          Last.fm/LB on Navidrome, session events on
                          Jellyfin/Emby)
  useBookmarkManager.ts — local bookmark map + server mirror
  useQueueSync.ts       — server-mirror for the playback queue
  usePlaybackPersistence.ts — the bridge between PlayingContext and
                          playbackSlice

src/features/           — feature-scoped modules that span providers
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
