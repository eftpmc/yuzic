# Design: the library-intent system

**Status: draft for discussion — nothing here is committed to until it survives review.**

This document proposes the next major evolution of yuzic: a unified entity
model, a capability-slot integration architecture, a Wants system, and
playlist import. Together they aim at one product statement:

> **Yuzic is the whole stack's front end.** Your server plays it, your tools
> fetch it, yuzic makes it feel like one service. It shines alone; every
> integration adds a superpower; none is required.

## 1. Why — the niche

The r/selfhosted "tried for months to fully replace Spotify — always end up
crawling back" genre of thread recurs monthly and always names the same
failures:

1. **Discovery dies.** No daily mixes, no "similar to this", no weekly
   discovery. The #1 stated reason people resubscribe.
2. **On-the-spot new music.** A track you don't own is a multi-tool chore
   away instead of a tap away.
3. **The glue layer breaks.** The typical stack is 8–10 services (Navidrome +
   two clients + Lidarr + slskd + SAB + qBit + Aurral + AudioMuse…), and the
   parts that fail are the glue services: wrong tracks grabbed silently,
   downloads that hang, playlists that don't sync.
4. **Migration is manual.** Getting playlists out of Spotify and into a
   self-hosted library is a hand-cranked pipeline across 3–4 tools.

Yuzic already integrates more of that stack than any other client (Lidarr,
slskd, SoulSync, AudioMuse, ListenBrainz, Deezer, MusicBrainz, Last.fm). What
it lacks is a model that makes them compose — today they are separate screens,
separate registries, separate mental models. The user's actual request, quoted
from the thread, is the spec:

> "one app where I can generate playlists, get recommendations, and see
> 'similar to this' based on my listening history."

## 2. Principles

These are load-bearing. Every design decision below traces to one of them.

**P1 — Local-first identity.** An entity's identity never requires a network
call. External ids are attributes that *arrive*, never dependencies that are
*fetched* to make an entity exist.

**P2 — External services are intentional.** A capability slot with no
user-enabled module makes zero network calls, and features above it degrade or
hide. Discovery integrations stay **off by default** — our users self-host
*because* they want to know where their data goes. Intentionality is
structural, not policy: an empty slot *cannot* call anyone.

**P3 — Ask, don't guess.** When resolution is ambiguous (three "Deluxe
Edition (Remastered)" candidates), the default is to ask. Auto-pick is a
global opt-in, off by default. A wrong file in the library is worse than a
tap. This is the direct answer to the glue-layer failure mode ("Aurral
regularly grabs the wrong tracks").

**P4 — Providers are peers; features own composition.** No provider receives
global priority because it is a server, external service, or built-in
integration. Each product feature explicitly defines whether its available
providers are selected, blended, used as fallbacks, or used only to enrich
missing data. Local/private remains the default baseline, but after the user
intentionally enables another source, the server does not automatically win.

**P5 — Contributors add integrations as leaf modules.** A new integration is
one module + one registry entry. The review surface is that module. Nothing
in screens, contexts, or the router changes.

## 3. Entity model — ownership is a property, not a screen

Today "external" albums/artists are a parallel screen family with their own
strings and flows. The refactor makes every artist/album/track one entity
with a **resolution state**:

```
LibraryState = 'in-library' | 'wanted' | 'acquirable' | 'external'
```

- `in-library` — exists on the active server (or local provider).
- `wanted` — the user has declared intent (§5).
- `acquirable` — not owned, but at least one enabled acquisition provider
  could get it.
- `external` — known about (via an enabled source), preview/browse only.

Every list row in the app — search results, discographies, playlist entries,
discovery shelves — renders the same row component with the same badge
vocabulary and the same action sheet; only the primary action differs by
state. This kills the duplicated external screens and is the precondition for
everything below (a playlist can hold unowned tracks; a shelf can mix owned
and unowned; import can show coverage).

### Identity (P1)

```
EntityKey   = normalized(artist) + normalized(title) [+ album, ± duration tolerance]
ExternalIds = { mbid?, deezerId?, providerNativeIds… }   // attributes, optional
```

- The **local key** always exists and is computed from data already on
  device. Arrival detection ("did my want appear in the library?") is a match
  against the local library index — inherently offline.
- **MBIDs are read from server tags** when present (Lidarr-managed libraries
  are full of them). Reading tags the server already sent is not an external
  call.
- An entity born from an enabled source (a Deezer shelf, an LB
  recommendation) *already carries* that source's id. No call happened at
  identity time.
- Precision lookups (e.g. MB canonicalization before a Soulseek search — the
  existing `slskd/mb/canonicalize.ts` path) happen **at action time**, as part
  of an act the user initiated, through a service the user enabled.
- No integrations enabled → matching is fuzzier → low-confidence matches are
  surfaced for confirmation (P3), never silently accepted.

## 4. Capability slots — the integration architecture

`ApiAdapter` already got this right for servers: optional fields, callers
presence-check the capability, never the type
(`src/api/types.ts`, architecture.md §1). We promote that from a
server-adapter pattern to the app-wide contract.

An **integration module** declares which slots it fills:

```
CapabilitySlot =
  | 'acquisition.track'      // slskd, SoulSync, (Lidarr: no)
  | 'acquisition.album'      // Lidarr, slskd
  | 'acquisition.monitor'    // Lidarr artist monitoring (future)
  | 'resolution'             // MusicBrainz: id refinement at action time
  | 'similarity.songs'       // server adapter, AudioMuse
  | 'similarity.artists'     // server adapter, Last.fm, ListenBrainz, Deezer
  | 'discovery.shelf'        // Deezer, ListenBrainz, server (random/now-playing)
  | 'discovery.playlists'    // ListenBrainz daily-jams / weekly-exploration
  | 'lyrics'                 // server today; LRCLIB candidate
  | 'scrobble'               // server adapter, ListenBrainz
  | 'preview'                // Deezer 30s samples
```

Consumers ask the slot, not the provider:

- The Wants router asks "who fills `acquisition.track`?" — it does not know
  slskd exists.
- The Home mix asks "who fills `similarity.songs`?" The server adapter may say
  yes via `getSimilarSongs2`, direct AudioMuse may provide acoustic results,
  and Last.fm may provide behavioral results. The **Home mix feature** decides
  whether to blend those sources, let the user select one, or keep them as
  separate shelves. The slot only exposes availability; it never implies a
  global provider order.
- The Connections screen generates itself from the registry and doubles as an
  honest data-flow statement: each module lists what it sends, to whom, and
  which features currently use it (P2).

### Three layers: connection, capability, feature

These concerns must stay separate:

1. **Connection** — can yuzic talk to the service? Owns credentials, endpoint,
   account identity, health, reconnect, and disconnect.
2. **Capability** — what can that connected service do? Declared by slots such
   as `scrobble`, `similarity.songs`, or `acquisition.track`.
3. **Feature** — what does the user want yuzic to do? Scrobbling, Daily Mix,
   lyrics, and Complete My Library each choose how to use one or more available
   capabilities.

A connection makes capabilities *available*; it does not enable every feature
or authorize every possible data flow. Connecting ListenBrainz for Weekly
Exploration must not silently enable direct scrobbling.

### Feature composition policies

There is deliberately no global provider priority. Different product features
need different semantics:

| Feature | Default policy |
|---|---|
| Scrobbling | Exactly one route per destination; avoid duplicate listens |
| Lyrics | Ordered fallback; user can change the order |
| Similar songs | Blend and dedupe, or user selects a source |
| Home discovery | Each shelf declares its own source(s) |
| Metadata/artwork enrichment | Fill missing fields; never replace trusted local tags silently |
| Acquisition | Ask at action time; never silently reroute on failure |
| Playlist recommendations | Preserve and display provenance |

Internally, a feature can use an explicit policy such as `exclusive`,
`fallback`, `blend`, `enrich`, or `ask`. These are architecture semantics, not
a requirement to expose a complicated rules editor to users. Safe defaults
remain simple; advanced control appears only where it has product value.

### Settings are feature-oriented

Users configure goals, not implementation topology. Primary settings live under
features such as **Home shelves**, **Discovery**, **Scrobbling**, **Lyrics**,
**Acquisition**, and **Playlist import**. Each feature page shows the providers
relevant to that job and can authenticate one in place. A user who chooses
ListenBrainz from Scrobbling should connect it there without navigating into a
generic integration screen and back out again.

The existing **Integrations** page becomes **Connections**. It remains useful,
but its role is operational: connected account/endpoint, credential health,
features using the connection, data sent, reconnect, and disconnect. It does
not own whether a Home shelf appears or where scrobbles go; the corresponding
feature page owns that behavior.

This is especially important for Wants: without providers it is an informative
wishlist. From the Wants screen, the user can choose to enhance it by connecting
an acquisition service there, in context.

### Module contract

```ts
type IntegrationModule = {
  id: string
  label: string
  auth: AuthDescriptor            // §7
  slots: Partial<Record<CapabilitySlot, SlotImpl>>
  options?: OptionsDescriptor     // §6 — provider-specific knobs, schema-driven
  testConnection(config): Promise<Health>
}
```

The three existing registries (`features/sources/registry.ts`,
`features/downloaders/registry.ts`, and the per-service settings screens)
converge on this one contract. The existing `DownloaderDefinition` is roughly
a two-slot module already; this is a generalization, not a rewrite of its
internals.

## 5. Wants — an intent queue, not a download queue

Today's `DownloadSheet` is imperative: "send this album to slskd now." A
**want** is declarative: "I want this in my library," and yuzic's job is to
get it there by any available means — or hold it until one exists.

```
Want = {
  key: EntityKey
  externalIds: ExternalIds
  unit: 'track' | 'album'          // track is the default (§5.3)
  origin: 'search' | 'shelf' | 'artist-page' | 'playlist-import' | 'mix'
  status: 'wanted' | 'routing' | 'confirming' | 'acquiring'
        | 'verifying' | 'arrived' | 'needs-attention'
  provider?: IntegrationId          // once dispatched
  createdAt / updatedAt
}
```

### 5.1 Works with zero providers

This is what keeps Wants universal rather than power-user-only:

- **No acquisition providers** → Wants is a wishlist. The user tags things
  anywhere in the app; when an entity appears in the library by *any* route
  (Bandcamp purchase, CD rip, manual desktop slskd), arrival detection
  resolves the want — "3 wants arrived" is a real moment.
- **Buy links** on every want (Bandcamp/Qobuz search URLs — no API, no
  tracking, just an outbound link). The thread's "please pay artists"
  contingent is real; one commenter literally keeps a monthly shopping list
  of his most-played unowned albums. A Wants list *is* that, automated.
  Ethical-by-default, downloaders as optional acceleration.

### 5.2 The router (action-time, remembered, never silent)

No settings-page priority list. Routing intent is captured **at the moment of
action** (P2/P3):

1. **One capable provider** → dispatch directly; status shows where it went.
2. **Multiple** → a one-tap sheet: "Get via: Soulseek / Lidarr", with an
   optional "always use this order." That builds the remembered order from a
   real choice at a real moment. The order is edited where it lives — on the
   Wants screen — not in settings.
3. **Ambiguous resolution** → `confirming`: show the matched release
   (canonicalized via the `resolution` slot when available) and ask (P3).
   Global "auto-pick best match" opt-in exists, default off.
4. **Failure/hang** → after a per-provider timeout, the want moves to
   `needs-attention` with "try «next provider» instead?" — user-triggered
   rerouting. **Never silent fallback**: silent rerouting is exactly the
   wrong-grab failure mode wearing a nicer coat.
5. **Arrival verification closes the loop.** A want is not done when the
   downloader says done; it is done when the entity matches the library
   index. The existing queue-diff → `startScan()` → staggered-sync machinery
   in `DownloadersQueueContext.tsx` already implements the middle of this
   loop; Wants adds the bookends (intent before, verification after).

### 5.3 Unit defaults

**Track-level by default; album is an explicit choice.** The thread complaint
is verbatim: "Lidarr only cares about entire albums and I sure as hell do not
want entire albums of a lot of artists." Track wants route to
`acquisition.track` (slskd, SoulSync); album and future artist-monitor wants
route to Lidarr where it is genuinely the right tool.

### 5.4 Deferred

Artist-subscription wants ("everything new from X") — deferred until
track/album wants are proven. Lidarr monitoring makes it cheap later via
`acquisition.monitor`.

## 6. Deepening the provider surfaces

The current integrations are shallow in ways that directly limit the features
above. This section is the concrete "we don't use what we have" inventory.

### Acquisition providers — user control per provider

Only slskd has preferences today (`SlskdSearchPreferences`: format, min
bitrate, free-slot). The `OptionsDescriptor` in the module contract makes
per-provider knobs schema-driven — the settings screen renders from the
schema, so adding an option touches only the module:

- **Lidarr** (currently zero knobs): quality profile, metadata profile, root
  folder, monitor-on-add, search-on-add. These aren't nice-to-haves — the
  quality profile decides *what the user actually receives*. All are plain
  Lidarr API lookups (`/qualityprofile`, `/rootfolder`) at config time.
- **slskd**: existing preferences fold into the schema unchanged; candidates
  for later: min file count for album matches, banned-user list passthrough.
- **SoulSync** (currently a bare track request): surface whatever its request
  pipeline accepts (quality preference at minimum); needs an API audit.
- Every provider gets `testConnection` health surfaced in one place (the
  Wants screen shows a degraded provider before the user wonders why nothing
  moves).

### Information integrations — reach the rest of the API

- **ListenBrainz** — the biggest untapped surface. We hold a user token and
  use it only to scrobble. The same token grants the personalized goldmine:
  `daily-jams` / `weekly-jams` / `weekly-exploration` playlists and CF
  recommendations (`discovery.playlists` slot). This is Spotify's Discover
  Weekly, self-hosted-adjacent, already authenticated, and privacy-consistent
  (the user chose to send LB their history; reading recommendations back adds
  no new data flow).
- **AudioMuse** — we call ping + similarity only. Its playlist-generation and
  analysis endpoints back "generate a playlist from these seeds" properly
  instead of client-side stitching. Needs an endpoint audit against a live
  instance.
- **Last.fm** — one endpoint today (`artist.getsimilar`). Cheap adds within
  the read-only bundled-key model: `track.getSimilar`, `artist.getTopTracks`,
  tag charts. Authenticated Last.fm (user scrobbles/library) is **out of
  scope**: it needs signed sessions, and scrobble forwarding is the server's
  job anyway (P4, §7.3).
- **Deezer** — used for shelves/search/previews; unused: editorial charts by
  genre, radio endpoints, `related` on more entity types. Fine to deepen
  opportunistically; not a priority since it's already the richest source.
- **Lyrics** — server-only today. LRCLIB is a natural `lyrics` slot module
  (anonymous, no key). Most self-hosted libraries lack synced lyrics; this is
  the cheapest big perceived-quality win in the whole plan. Off by default
  like every external source (P2).

## 7. Auth model

Three tiers, declared per module in `AuthDescriptor` so the settings UI and
the data-flow statement are generated, not hand-maintained:

```
'none'      — anonymous public API        (Deezer, MusicBrainz, LRCLIB, LB similar-artists graph)
'apiKey'    — server-issued key/token     (Lidarr, slskd, SoulSync, AudioMuse, ListenBrainz token)
'account'   — signed per-user session     (none today; Last.fm authenticated would be here — avoided)
```

Rules:

1. **Anonymous tiers state what they leak.** "No account" still sends query
   contents (artist/title lookups) to the service. The per-module data-flow
   line covers this honestly.
2. **Secrets live in the OS keystore.** The mTLS identity already set the
   precedent (`clientCertificateStore.ts`, expo-secure-store, never in
   redux-persist). Downloader API keys and the LB token currently persist in
   MMKV via redux-persist; migrate them to secure storage under the same
   pattern. One-time migration on upgrade, transparent to the user.
3. **Scrobble ownership is explicit.** Navidrome may forward scrobbles to
   Last.fm and ListenBrainz server-side; yuzic can also scrobble to ListenBrainz
   directly. Both on = double listens, corrupting the history that
   recommendations depend on. Scrobbling therefore uses an `exclusive` feature
   policy per destination. Where the server can report forwarding state, yuzic
   displays it; where it cannot, yuzic asks the user. It does **not** presume
   the server wins: the user chooses the route on the Scrobbling feature page,
   with the duplicate-risk explained.
4. **Authentication is contextual and reusable.** A feature page can initiate
   the connection it needs. The resulting connection is stored centrally and
   can be reused by other features, but those features remain disabled until
   the user enables them independently. Authentication grants availability,
   not blanket permission.
5. **Multi-server scoping stays.** Downloader configs are already
   per-server; integration configs follow the same scoping (a user's home
   Navidrome and remote Jellyfin may have different companion stacks).

## 8. Playlist import — the migration moment

With Wants in place, import is nearly free and is the headline feature for
the "crawling back to Spotify" audience:

1. User pastes a Spotify/YTM playlist URL (or raw track list / CSV — v1 can
   start there; public-playlist scraping without API keys is an
   implementation detail to spike, several OSS projects do it).
2. Tracks resolve against the local index → **coverage view**: "34 of 50
   already in your library."
3. One tap converts the missing 16 into track wants → router (§5.2).
4. The playlist materializes as a real server playlist immediately, with
   in-library tracks present and wanted tracks joining as they arrive.

This replaces the Soundiiz → yt-dlp → Picard → server hand-cranked pipeline
that thread users describe, inside the client, with the user's own tools.

## 9. Discovery, privacy-consistent

Off by default, useful anyway (P2):

- **Local-first Home mix**: play-stats + genres already on device, plus
  server-side similarity (`getSimilarSongs2`) — which transparently includes
  anything the user's server plugins provide (AudioMuse NV plugin etc.). A
  fully private daily mix with zero external calls.
- **Onboarding asks once**, transparently: "Want external discovery?
  (Deezer/ListenBrainz — no accounts; here's exactly what gets sent)." One
  intentional choice instead of five buried toggles.
- Discovery output feeds Wants: every recommended unowned item is one tap
  from `wanted`. Weekly discovery generation (the in-app replacement for the
  broken glue services) is just "discovery slot output → wants input" once
  both exist.

## 10. Slicing

Each phase ships alone and is useful without the ones after it.

| Phase | Contents | Depends on |
|---|---|---|
| **A. Entity model** | `LibraryState` on one row model; kill parallel external screens; local `EntityKey` + carried `ExternalIds` | — |
| **B. Module contract** | Converge sources + downloaders registries on `IntegrationModule`; schema-driven options (Lidarr knobs land here); secure-storage migration; generated Integrations screen with data-flow lines | A (soft) |
| **C. Wants v1** | Want slice + router + Wants screen (Library entry row); ask-by-default confirm; arrival detection; buy links; needs-attention flow | A, B |
| **D. Playlist import** | Paste → coverage → wants → materialized playlist | C |
| **E. Discovery deepening** | LB recommendation playlists; local-first Home mix; AudioMuse playlist endpoints; LRCLIB lyrics slot; onboarding discovery prompt | B (C for want-taps) |

Open items to spike before/while building:

- SoulSync and AudioMuse API audits against live instances (what do their
  pipelines actually accept?).
- Spotify public-playlist scraping viability without API keys (v1 fallback:
  pasted track list / CSV).
- Navidrome's reporting of server-side scrobble-forwarding config (for §7.3
  auto-detection vs. ask-once).
- Whether `EntityKey` normalization needs duration at all, or artist+title
  (+album) suffices against real libraries — test against a large library.

## 11. Non-goals

- **Chasing every downloader.** The thread names Downtify, tidarr,
  DroppedNeedle, musicgrabber, yubal… We don't play integration bingo; we
  make adding one a leaf module (P5) and let demand pull them in
  (Downtify is already backlogged as #120 and becomes a good first external
  contribution once B lands).
- **Betting on any single proxy/tool** (e.g. octo-fiesta). Subsonic-proxy
  setups work with yuzic today by construction; anything smarter is a later,
  optional module like everything else.
- **Authenticated Last.fm.** Signed-session scrobbling duplicates what
  servers already do (P4).
- **Cross-server library merging.** Orthogonal to this design; unchanged.
