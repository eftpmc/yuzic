# Servers, integrations, and downloaders

Everything yuzic can talk to, what it needs from you, and where it's
configured in the app. Three separate things live here and they're easy to
confuse:

- A **server** is where your music actually is. You need exactly one to use
  the app (you may add several and switch between them).
- An **integration** is an outside service that adds metadata, discovery, or
  scrobbling on top of that library. All optional, all off until switched on.
- A **downloader** fetches music you don't own yet into your server's library.
  Optional, and self-hosted by you.

For how a provider is wired in internally — the `ApiAdapter` contract and the
presence-gating rule — see [architecture.md](architecture.md).

---

## Servers

| Server | Type id | Auth | Public demo |
| --- | --- | --- | --- |
| Navidrome (any Subsonic-compatible server) | `navidrome` | username + password (Subsonic token auth) | Yes — `demo.navidrome.org` |
| Jellyfin | `jellyfin` | username + password → access token | No |
| Emby | `emby` | username + password → access token | No |

Configured during onboarding, and afterwards in **Settings → Server**. Each
server also carries optional **fallback URLs** (tried in order when the primary
is unreachable — e.g. a Tailscale address away from home) and optional HTTP
basic auth in front of the server.

Provider registry: `src/utils/servers/registry.ts` — which also holds the
per-provider facts that aren't API calls (demo credentials, cover URLs, and
which `auth` key stores the chosen libraries). Adapters: `src/api/navidrome/`
for Subsonic, and `src/api/mediaBrowser/adapter.ts` for both Jellyfin and Emby,
which speak the same API and differ only by brand — `src/api/jellyfin/` and
`src/api/emby/` are thin bindings over it.

### What each server can back

The base surface — auth, albums, artists, genres, playlists, starred, songs,
tracks, similar, lyrics, search — works everywhere. These are optional, and the
UI shows them only when the active server's adapter provides them:

| Capability | `ApiAdapter` field | Navidrome | Jellyfin / Emby |
| --- | --- | --- | --- |
| Internet radio stations | `radio` | ✅ | — |
| Public share links | `shares` | ✅ | — |
| Resume positions / bookmarks | `bookmarks` | ✅ (native endpoint) | ✅ (from `PlaybackPositionTicks`) |
| Server-side play queue sync | `queue` | ✅ | — |
| Random songs + who else is listening | `discovery` | ✅ | — |
| Podcasts | `podcasts` | ✅ | — |

A Jellyfin user never sees a Radio row rather than seeing one that goes
nowhere — the Library index builds its rows from what the adapter offers
(`src/screens/library/LibraryEntryRows.tsx`).

---

## Integrations

All of these live under **Settings → Integrations**, and every one of them is
off until you turn it on. Nothing here is required for the app to work.

| Integration | Account needed | What it adds |
| --- | --- | --- |
| [Deezer](#deezer) | No | Discovery shelves, search results, external artist/album pages, top tracks, similar artists, recommendations, 30s preview samples |
| [MusicBrainz](#musicbrainz) | No | Canonical artist/album metadata for things not in your library |
| [Last.fm](#lastfm) | No | Similar artists and playlist-recommendation seeds |
| [ListenBrainz](#listenbrainz) | Token, for scrobbling | Scrobbling + now-playing; and, separately, the public similar-artist graph for discovery |
| [AudioMuse-AI](#audiomuse-ai) | Self-hosted instance | Acoustic-similarity autoplay ("Smart Shuffle") and playlist generation |

Scrobbling to Last.fm on a Navidrome server is a **server-side** setting, not
an app one: Navidrome forwards scrobbles itself. **Settings → Server** is where
the app's own scrobble/now-playing switches live.

### Deezer

`src/api/deezer/` · **Settings → Integrations → Deezer**

Read-only, unauthenticated public API. Three switches, one per place the data
shows up:

- **Discovery** — Deezer charts, genre artists, and recommendations on Home.
  Off by default, and absent when offline.
- **Search** — include Deezer results alongside your library's.
- **External artist & album data** — fill in artist and album screens for
  things your server doesn't have: top tracks, similar artists, track lists,
  and 30-second preview samples.

There used to be a per-surface switch for each of those last four. They were
retired into the switch above them and the persisted keys are stripped by a
store migration (`src/utils/redux/store.ts`) — don't reintroduce them.

Deezer is also one of the two external **sources** (with MusicBrainz) behind
artist/album resolution — see `src/features/sources/registry.ts`.

### MusicBrainz

`src/api/musicbrainz/` · **Settings → Integrations → MusicBrainz**

Read-only, no account. Fills in artist and album pages with canonical metadata
when the entity isn't in your library, and supplies MBIDs that the downloaders
use to resolve a release precisely instead of by fuzzy name match.

### Last.fm

`src/api/lastfm/` · **Settings → Integrations → Last.fm**

Read-only with a bundled API key — no account, no signing, no session. Used for
similar artists and to seed playlist recommendations. Artist names are sent to
Last.fm to look them up, which is why it's a switch rather than always-on.

### ListenBrainz

`src/api/listenbrainz/` · **Settings → Integrations → ListenBrainz**

Two independent things behind one row:

- **Discovery** reads the public similar-artist graph and takes no account, so
  it sits above the credentials and is off until switched on.
- **Scrobbling + now-playing** needs your ListenBrainz username and user token,
  entered in the app. Now-playing follows the scrobble switch.

### AudioMuse-AI

`src/api/audiomuse/`, `src/features/audiomuse/` · **Settings → Integrations → AudioMuse-AI**

A self-hosted service you point at the same music server. Needs a server URL
and API token. When connected and enabled, it becomes the queue-fill provider
for autoplay — extending the queue with sonically similar tracks ranked by
acoustic analysis, instead of the server's own similar-songs endpoint
(`src/contexts/queueProviders.ts`). It also backs playlist generation from a
seed track (`src/features/audiomuse/generatePlaylist.ts`).

---

## Downloaders

**Settings → Downloaders**. Each takes a server URL and an API key, is
per-server, and shows its own live transfer queue in the app. When a transfer
finishes, the app nudges your music server to rescan so the new music appears
without a manual pull (`src/features/downloaders/DownloadersQueueContext.tsx`).

| Downloader | Label in app | Albums | Individual tracks | Settings |
| --- | --- | --- | --- | --- |
| [Lidarr](https://lidarr.audio) | Lidarr | ✅ | — (Lidarr is album-oriented) | Server URL + API key (Lidarr → Settings → General) |
| [slskd](https://github.com/slskd/slskd) (Soulseek) | Soulseek | ✅ | ✅ | Server URL + API key, plus its own search preferences |

Registry and the shared `DownloaderDefinition` shape:
`src/features/downloaders/registry.ts`. A downloader is offered on an external
album page only when it's configured for the active server.

> **Downloaders are not the same thing as offline downloads.** A downloader
> adds music to your *server*. Offline downloads copy music already in your
> library onto *this device* — those live in the app's private storage and are
> managed under **Settings → Library → Downloads**.

---

## Endpoints we call

Every outside service the app talks to, endpoint by endpoint. Nothing here
fires unless the matching switch is on, so a default install with one server
configured makes **no** requests to any of these hosts.

### How a request is handled

- **Timeout.** Every integration request goes through `fetchWithTimeout`
  (`src/api/fetchWithTimeout.ts`) with a 30s ceiling, and a timeout is raised
  as `RequestTimeoutError` so a caller can tell it apart from an abort. The
  integrations had no ceiling at all once, which left a spinner up forever on a
  black-holed connection.
- **Caching.** Deezer keeps its own in-memory TTL cache with per-endpoint
  lifetimes and a 500-entry cap, and coalesces identical in-flight requests
  (`src/api/deezer/catalog.ts`). Everything else caches at the react-query
  layer in the hook that calls it. slskd searches are coalesced through
  `src/api/coalesceRequest.ts` — a double tap otherwise starts a second
  45-second Soulseek search and queues the files twice.
- **Failure.** A metadata read that fails degrades to nothing — an empty list,
  a section that doesn't render — rather than an error state, because none of
  it is load-bearing. Downloader and scrobble calls surface a real error,
  because the user asked for those directly.
- **Auth.** Bearer/token headers where the service needs one (see the tables);
  Deezer and MusicBrainz are unauthenticated; Last.fm uses a bundled read-only
  `api_key` with no signing or session.

### Deezer — `https://api.deezer.com`

No auth. `src/api/deezer/`.

| Endpoint | Used for | Cache |
| --- | --- | --- |
| `GET /search/artist` | Resolving an artist by name; Deezer results in search | 12h |
| `GET /search/album` | Resolving an album; Deezer results in search; preview lookup | 12h |
| `GET /artist/{id}` | External artist page | 7d |
| `GET /artist/{id}/albums` | Discography on an external artist page | 1d |
| `GET /artist/{id}/related` | Similar artists | 7d |
| `GET /artist/{id}/top` | Top tracks on an artist page | 1d |
| `GET /album/{id}` | External album page | 1d |
| `GET /album/{id}/tracks` | 30-second preview samples | — |
| `GET /genre` | Home genre shelf | 30d |
| `GET /genre/{id}/artists` | Home genre shelf | 30d |
| `GET /chart/0/artists` | Home "top artists" shelf | 6h |
| `GET /chart/0/albums` | Home Deezer charts shelf | 6h |

### MusicBrainz — `https://musicbrainz.org/ws/2`

No auth, `User-Agent` identifies the app. `src/api/musicbrainz/index.ts`.

| Endpoint | Used for |
| --- | --- |
| `GET /artist?query=` | Resolving an artist by name |
| `GET /artist/{mbid}?inc=release-groups` | External artist page + discography |
| `GET /release-group?query=` | Resolving an album by artist + title |
| `GET /release-group/{mbid}?inc=artist-credits` | External album page |
| `GET /release?release-group={mbid}&inc=recordings+artist-credits` | Track list for an album |

Cover art comes from `https://coverartarchive.org/release-group/{mbid}/front-500`,
built as a URL rather than requested by us.

### Last.fm — `https://ws.audioscrobbler.com/2.0/`

Bundled `api_key`, no signing, no session. `src/api/lastfm/`.

| Endpoint | Used for |
| --- | --- |
| `POST artist.getsimilar` | Similar artists on an artist page; seeding playlist recommendations |

Nothing else on the Last.fm API is called — see
[what we deliberately don't call](#what-we-dont-call).

### ListenBrainz — `https://api.listenbrainz.org/1`

`Authorization: Token <user token>`, except where noted. `src/api/listenbrainz/`.

| Endpoint | Used for |
| --- | --- |
| `GET /validate-token` | Testing the token when you connect, and on reconnect |
| `POST /submit-listens` (`listen_type: single`) | Scrobbling a completed track |
| `POST /submit-listens` (`listen_type: playing_now`) | Now-playing |
| `GET https://labs.api.listenbrainz.org/similar-artists/json` | The Home "similar to what you play" shelf. No auth — this is the public graph, and it's the Discovery switch rather than the account |

### AudioMuse-AI — your instance

`Authorization: Bearer <api token>`. `src/api/audiomuse/`.

| Endpoint | Used for |
| --- | --- |
| `GET /api/health` | Connection test in Settings |
| `GET /api/similar_tracks` | Autoplay queue extension and playlist generation. One seed track per request, so the queue filler walks seeds newest-first and stops once it has enough unique results |

### Lidarr — your instance, `/api/v1`

`X-Api-Key`. `src/api/lidarr/`.

| Endpoint | Used for |
| --- | --- |
| `GET /system/status` | Connection test |
| `GET /artist` · `GET /artist/lookup?term=` · `POST /artist` | Finding the artist a requested album belongs to, adding them if Lidarr doesn't track them yet |
| `GET /rootfolder` | Picking a path when adding an artist |
| `GET /album?artistId=` | Locating the requested album on that artist |
| `PUT /album/{id}` | Marking the album monitored |
| `GET /command` · `POST /command` (`AlbumSearch`) | Kicking off the search — the `GET` first, so a search already queued or running isn't started twice |
| `GET /queue?includeAlbum=true&includeArtist=true&pageSize=100` | The in-app transfer queue, and spotting finished items |
| `DELETE /queue/{id}` | Cancelling a download |

### slskd — your instance, `/api/v0`

`X-API-Key`. `src/api/slskd/`.

| Endpoint | Used for |
| --- | --- |
| `GET /application` | Connection test |
| `POST /searches` | Starting a Soulseek search for an album or track |
| `GET /searches/{id}` | Polling until `isComplete` |
| `GET /searches/{id}/responses` | Reading the results to pick a directory or file |
| `DELETE /searches/{id}` | Cleaning up the search — runs on the timeout and error paths too |
| `POST /transfers/downloads/{username}` | Enqueueing the chosen files |
| `GET /transfers/downloads/` | The in-app transfer queue, and spotting finished items |
| `DELETE /transfers/downloads/{username}/{fileId}?remove=false` then `?remove=true` | Cancelling — the first call is allowed to fail, since a file that already finished can't be cancelled |

slskd downloads also reach MusicBrainz (`src/api/slskd/mb/canonicalize.ts`) to
turn an MBID into a canonical artist/album/track list before matching filenames
against it.

## What we don't call

| Service | Not used | Why |
| --- | --- | --- |
| Last.fm | Scrobbling (`track.scrobble`, `track.updateNowPlaying`, `auth.getSession`) | Would need an api_secret, MD5 signing, and a per-user session. On Navidrome the server already forwards scrobbles to Last.fm; the app doesn't duplicate that. |
| Deezer | Everything behind OAuth — user playlists, favourites, full-length streams | Deezer's public read API needs no account, and adding OAuth would mean shipping an app secret and asking users to log into a service that isn't hosting their music. Samples are the 30-second previews the public API returns. |
| ListenBrainz | `GET /cf/recommendation/user/{user}/recording` and `GET /user/{user}/playlists/recommendations` | **Written but not wired up.** `getRecommendedRecordings` and `getUserRecommendedPlaylists` exist in `src/api/listenbrainz/recommendations/` and are exported, and nothing calls them — the Home shelf uses the labs similar-artists endpoint instead. Either surface them or delete them; don't assume they're live. |
| Deezer | `getAlbumEmbeddedPreviews` (`src/api/deezer/albums/index.ts`) | Same story: exported, no callers. `searchAlbumPreviews` is the path samples actually take. |
| MusicBrainz | Submitting anything (tags, ratings, edits) | The app is a read-only consumer of MusicBrainz. |
| Lidarr | Everything outside the add-artist → monitor-album → search flow: quality profiles, indexers, history, calendar, import lists | The app is a request button, not a Lidarr client. Configure Lidarr in Lidarr. |
| slskd | User browsing, chat, rooms, shares, uploads | Same reason. The app searches, enqueues, watches, and cancels. |

## Casting

`src/contexts/CastContext.tsx`, `src/hooks/useDlnaDiscovery.ts`

DLNA/UPnP renderers are discovered on the local network over SSDP, and AirPlay
routes are offered on iOS. Both are picked from the output-device sheet on the
player screen. Nothing to configure.
