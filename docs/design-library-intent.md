# Design: the library-intent system

**Status: reconciled decision record (2026-09-12).** This supersedes the earlier
draft on this branch (commits `027d66e6`, `778eee4a`). It reflects settled
product decisions from the redesign discussion. It is a design spec, not an
implementation authorization — provider-surface specifics marked *(pending
audit)* are being verified against upstream docs/source before they are built.

This document proposes the next evolution of yuzic: a unified entity model, a
capability-slot integration architecture, a Wants intent system, and
feature-oriented settings. The product statement:

> **Yuzic is the whole stack's front end.** Your server plays it, your tools
> fetch it, yuzic makes it feel like one service. It shines alone; every
> integration adds a capability; none is required.

## 0. Working constraints

- **Clean code is an acceptance criterion.** One owner per concern; typed
  capabilities and provider options; a single shared entity presentation; and
  superseded paths removed after migration, not left alongside their
  replacements. Avoid speculative generic frameworks — build the abstraction
  the real providers need, not one for providers that do not exist.
- **Per-server separation is preserved this pass.** Wants, library, and
  downloader setup remain scoped to the active server. There is no global Wants
  list and no cross-server unified library in this pass.
- **Possession is not consent.** Holding a credential or token authenticates a
  connection; it never authorizes a feature or a data flow. Every capability is
  enabled independently, and read requests are treated as disclosures too.

## 1. Why — the niche

The r/selfhosted "tried for months to fully replace Spotify — always end up
crawling back" genre of thread recurs monthly and names the same failures:

1. **Discovery dies.** No "similar to this", no rotating shelves, no local
   daily mix. The most-cited reason people resubscribe.
2. **On-the-spot new music.** A track you don't own is a multi-tool chore away
   instead of a tap away.
3. **The glue layer breaks.** The typical stack is 8–10 services (Navidrome +
   two clients + Lidarr + slskd + SAB + qBit + AudioMuse…), and the parts that
   fail are the glue services: wrong tracks grabbed silently, downloads that
   hang, status you cannot see.

Yuzic already integrates more of that stack than any other client (Lidarr,
slskd, SoulSync, AudioMuse, ListenBrainz, Deezer, MusicBrainz, Last.fm). What
it lacks is a model that makes them compose — today they are separate screens,
separate registries, separate mental models.

**In scope for this pass:** making those integrations compose (entity model +
capability slots), a save-only Wants system with an explicit Get action,
reliable and honest downloader status, and improving the discovery and metadata
we can already reach. **Explicitly out or deferred** (see §14): playlist import,
smart-playlist/filter engines, and any new generic mix-generator algorithm. We
improve existing capabilities; we do not invent recommendation algorithms in
this pass.

## 2. Principles

These are load-bearing. Every decision below traces to one.

**P1 — Local-first, stable identity.** An entity's identity is a **stable local
id**, assigned on device, never a network call and never fuzzy-normalized
metadata used as a guaranteed primary key. Matching (deciding two records are
the same work) is a *separate* concern from identity; external ids (MBID,
Deezer id, provider-native ids) are additive attributes that *arrive*, never
dependencies fetched to make an entity exist. No mandatory MBID/Deezer lookup.

**P2 — External services are intentional.** A capability slot with no
user-enabled module makes zero network calls, and features above it degrade or
hide. Discovery integrations stay **off by default** — our users self-host
*because* they want to know where their data goes. Intentionality is
structural, not policy: an empty slot *cannot* call anyone.

**P3 — Ask, don't guess.** When resolution is ambiguous, the default is to ask.
Unknown or ambiguous matches default to asking, never silent acceptance. A
wrong file in the library is worse than a tap. Auto-pick is an explicit opt-in,
off by default.

**P4 — Providers are peers; features own composition.** No provider receives
global priority for being a server, an external service, or a built-in. Each
feature explicitly defines whether its providers are selected, blended, used as
fallback, or used only to enrich missing data. Local/private is the default
baseline, but after the user enables another source the server does not
automatically win.

**P5 — Contributors add integrations as leaf modules.** A new integration is
one module + one registry entry. The review surface is that module. Screens,
contexts, and the router do not change.

## 3. Entity model — ownership is a property, not a screen

Today "external" albums/artists are a parallel screen family with their own
strings and flows. The refactor makes every artist/album/track one entity with
a **resolution state**:

```
LibraryState = 'in-library' | 'wanted' | 'acquirable' | 'external'
```

- `in-library` — exists on the active server (or local provider).
- `wanted` — the user has declared intent (§5). Save-only; no acquisition implied.
- `acquirable` — not owned, but at least one enabled acquisition provider could get it.
- `external` — known about via an enabled source; preview/browse only.

Every list row in the app — search results, discographies, discovery shelves —
renders the same row component with the same badge vocabulary and the same
action sheet; only the primary action differs by state. This kills the
duplicated external screens and is the precondition for the rest (a shelf can
mix owned and unowned; Wants can hold unowned entities).

### Identity and matching (P1)

```
LocalId     = stable on-device id, assigned at creation, never recomputed from metadata
ExternalIds = { mbid?, deezerId?, providerNativeIds… }   // additive attributes, optional
MatchKey    = derived matching signal (artist/title[/album][/±duration]) — used FOR MATCHING, not as identity
```

- The **local id** always exists and never depends on a network call. It is not
  a normalized-metadata string; normalization is used only as a matching signal.
- **Arrival detection** ("did my want appear in the library?") is a match of the
  want against the local library index — inherently offline.
- **MBIDs are read from server tags** when present (Lidarr-managed libraries are
  full of them). Reading tags the server already sent is not an external call.
- An entity born from an enabled source already carries that source's id; no
  call happened at identity time.
- Precision lookups (e.g. MusicBrainz canonicalization before a Soulseek search,
  the existing `slskd/mb/canonicalize.ts` path) happen **at action time**, as
  part of an act the user initiated, through a service the user enabled.
  Enabling slskd does not by itself authorize the MusicBrainz dependency inside
  it; that dependency is disclosed and consented honestly.
- No integrations enabled → matching is fuzzier → low-confidence matches are
  surfaced for confirmation (P3), never silently accepted.

## 4. Capability slots — the integration architecture

`ApiAdapter` already got this right for servers: optional fields, callers
presence-check the capability, never the type (`src/api/types.ts`,
architecture.md §1). We promote that from a server-adapter pattern to the
app-wide contract.

An **integration module** declares which slots it fills:

```
CapabilitySlot =
  | 'acquisition.track'      // slskd, SoulSync (Lidarr: no)
  | 'acquisition.album'      // Lidarr, slskd
  | 'acquisition.monitor'    // Lidarr artist monitoring (deferred, §5.4)
  | 'resolution'             // MusicBrainz: id refinement at action time
  | 'similarity.songs'       // server adapter, AudioMuse
  | 'similarity.artists'     // server adapter, Last.fm, ListenBrainz, Deezer
  | 'discovery.shelf'        // Deezer, ListenBrainz, server (random/now-playing)
  | 'lyrics'                 // server today; LRCLIB candidate
  | 'scrobble'               // server adapter, ListenBrainz, Last.fm (direct, §7.3)
  | 'metadata.enrich'        // artist info / artwork, display-only (§9)
  | 'preview'                // Deezer 30s samples
```

Consumers ask the slot, not the provider:

- The Get router asks "who fills `acquisition.track`?" — it does not know slskd
  exists.
- A Home shelf asks "who fills `similarity.songs`?" The server adapter may say
  yes via `getSimilarSongs2`; AudioMuse may add acoustic results. The **feature**
  decides whether to blend, let the user pick one, or keep them as separate
  shelves. The slot only exposes availability; it never implies a global order.
  (Note: a server's similarity call may itself reach upstream services — "only
  the chosen server" is not a guarantee of no external calls anywhere, and the
  data-flow line says so.)
- The Connections screen generates itself from the registry and doubles as an
  honest data-flow statement: each module lists what it sends, to whom, and
  which features currently use it (P2).

### Three layers: connection, capability, feature

These concerns stay separate:

1. **Connection** — can yuzic talk to the service? Owns credentials, endpoint,
   account identity, health, reconnect, disconnect.
2. **Capability** — what can that connected service do? Declared by slots.
3. **Feature** — what does the user want yuzic to do? Scrobbling, discovery
   shelves, lyrics, metadata enrichment, acquisition each choose how to use one
   or more available capabilities.

A connection makes capabilities *available*; it does not enable every feature or
authorize every data flow. Connecting ListenBrainz for a discovery shelf must
not silently enable direct scrobbling.

**After connecting**, yuzic may show *skippable* suggestions of other features
that connection actually supports — **all unchecked by default**. The user
authenticates once; each feature's data flow is enabled individually.

**Connection failures are contained to the affected features**, with a small
reconnect notice and the details living in Connections. No repeated global login
dialogs; no silent provider switching. Acquisition jobs affected by a failed
connection are flagged as needing attention rather than silently rerouted.

### Feature composition policies

There is deliberately no global provider priority. Different features need
different semantics:

| Feature | Default policy |
|---|---|
| Scrobbling | Exactly one route per destination per server; avoid duplicate listens |
| Lyrics | Ordered fallback the user configures (§10) |
| Similar songs | Blend and dedupe, or user selects a source |
| Home discovery | Each shelf declares its own source(s); external in separate shelves; blending explicit per mix |
| Metadata / artwork enrichment | Fill missing fields, display-only, never write to server tags (§9) |
| Acquisition | Ask at action time; never silently reroute on failure |

Internally a feature can use an explicit policy — `exclusive`, `fallback`,
`blend`, `enrich`, or `ask`. These are architecture semantics, not a rules
editor exposed to users. Safe defaults stay simple; advanced control appears
only where it has product value.

### Settings are feature-oriented

Users configure goals, not implementation topology. Feature-oriented pages —
**Home**, **Search**, **Scrobbling**, **Lyrics**, **Metadata**, **Downloaders**
— improve rather than replace the core Settings. Servers, Library, Appearance,
Playback/Offline, and account/app controls remain first-class settings areas.
Each feature page shows the providers relevant to that job and can authenticate
one in place, then return.

The existing **Integrations** page becomes **Connections**: a central
operational view of connected account/endpoint, credential health, features
using the connection, data sent, reconnect, and disconnect. It is not a maze
users must visit first, and it does not own whether a shelf appears or where
scrobbles go — the feature page owns that.

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

The existing registries (`features/sources/registry.ts`,
`features/downloaders/registry.ts`, and per-service settings screens) converge
on this one contract. `DownloaderDefinition` is roughly a two-slot module
already; this is a generalization, not a rewrite of its internals. Superseded
per-service paths are removed after migration (§0).

## 5. Wants — a save-only intent list; Get is a separate action

A **want** is declarative: "I want this in my library." Crucially, **Wants is
save-only**, even when downloaders are connected. Saving a want makes **no
acquisition and no network request**. **Want ≠ Get.**

Unavailable entities present parallel **Want** and **Get** actions:

- **Want** saves only, scoped to the selected server. It is a useful, informative
  wishlist with no services required.
- **Get** opens acquisition directly. Get is available from entity pages
  *without* first adding a Want. Get does not require a prior Want.

```
Want = {
  localId: LocalId
  externalIds: ExternalIds
  unit: 'track' | 'album'          // track is the default (§5.3)
  origin: 'search' | 'shelf' | 'artist-page' | 'manual'
  jobRef?: AcquisitionJobId         // reference only when a Get was started (§5.2)
  createdAt / updatedAt
}
```

Wants owns **intent only**. It does not own submission, status, retries,
cancellation, or arrival — the existing acquisition job system owns those. A
Want that has been Got *references* the job; it does not duplicate the queue or
resubmit an already-active equivalent job.

### 5.1 Works with zero providers

- **No acquisition providers** → Wants is a wishlist. When an entity appears in
  the library by *any* route (Bandcamp purchase, CD rip, manual desktop slskd),
  arrival detection resolves the want.
- **Manual Add** via a bottom sheet: Track/Album, title, artist. Local save, no
  mandatory lookup.

### 5.2 Get — action-time, remembered, never silent

There is no settings-page priority list that silently routes acquisition.
Acquisition intent is captured **at the moment of Get** (P2/P3):

1. **One capable provider** → dispatch; status shows where it went.
2. **Multiple** → a Get-review sheet with quick overrides. Separate default
   selectors exist for **tracks** and **albums** (compatible providers only;
   "ask each time" is a valid choice). Overrides in the review are request-only
   unless the user explicitly saves them as defaults. No forced global ranked
   priority list.
3. **Ambiguous resolution** → ask when the provider exposes candidates (show the
   matched release, canonicalized via the `resolution` slot when available). When
   a provider does *not* expose a preview and manages matching itself, that is
   accepted but **explained** ("the service chooses the match"); yuzic shows the
   real supported options and never fabricates an exact-match guarantee.
4. **Failure/hang** → after a per-provider timeout, the want moves to
   **needs-attention**, linked to the **same** job detail and actions, with an
   explicit "try another provider?" No silent fallback. Never silently convert a
   track request into a whole-album request.
5. **Arrival verification closes the loop.** A want is done only when the entity
   is **verified present in the target library index**, not when the downloader
   queue item disappears. On arrival the fulfilled want leaves the active list
   with brief "now in your library / play" feedback. There is **no Arrived
   collection** — Recently Added already serves that role — but provenance and
   job details are retained unobtrusively. The existing queue-diff → `startScan()`
   → staggered-sync machinery in `DownloadersQueueContext.tsx` implements the
   middle of this loop; Wants/Get add the bookends.

### 5.3 Unit defaults

**Track-level by default; album is an explicit choice.** Track wants/gets route
to `acquisition.track` (slskd, SoulSync); album and future artist-monitor wants
route to Lidarr where it is genuinely the right tool.

### 5.4 Deferred

Artist-subscription wants ("everything new from X") are deferred until
track/album wants are proven; Lidarr monitoring (`acquisition.monitor`) makes it
cheap later.

### 5.5 Downloads screen — one screen, two semantics

There is **one Downloads screen** in Library, alongside Wants, with two short
sections: **Offline** and **Downloaders**. These carry distinct
destination/execution semantics under shared UI, and are **not conflated**:
Offline is on-device download jobs; Downloaders is server-side acquisition.

The Downloaders section shows **all activity reported by each connected
downloader**, including jobs started **outside** yuzic — not only app-originated
requests. Origin is identified where knowable; yuzic never fabricates linkage.
External jobs do **not** automatically create Wants, and yuzic exposes only the
controls (cancel/retry) the reporting provider actually supports, keeping the
provider and externally-started origin visible.

## 6. Deepening the provider surfaces *(pending audit)*

The current integrations are shallow in ways that limit the features above. The
concrete "what do we hold vs. what do we use" inventory is being verified by a
dedicated API audit (downloaders + discovery), grounded in upstream docs/source,
before any of these are built. What follows names candidate depth; specific
endpoints are not treated as fact until the audit confirms route, method, auth,
and disclosure.

### Acquisition providers — user control per provider

`OptionsDescriptor` makes per-provider knobs schema-driven; the settings screen
renders from the schema, so adding an option touches only the module.

- **Lidarr** (currently zero knobs): quality profile, metadata profile, root
  folder, monitor-on-add, search-on-add — the quality profile decides *what the
  user receives*. Exact route signatures pending audit.
- **slskd**: existing `SlskdSearchPreferences` (format, min bitrate, free-slot)
  fold into the schema unchanged; further knobs pending audit.
- **SoulSync**: currently a bare track request; surface whatever its pipeline
  accepts. Pending audit.
- Every provider surfaces `testConnection` health in one place (the Wants/Get
  and Downloads surfaces show a degraded provider before the user wonders why
  nothing moves).

### Information integrations

- **ListenBrainz** — we hold a user token and currently use it only to scrobble
  and to read the public similar-artists graph. Holding the token neither proves
  a token is required for public reads nor grants consent to read
  recommendations back — any recommendation/playlist use is a separate,
  explicit, consented feature. The full token-capability matrix is pending audit.
- **AudioMuse** — we call ping + similarity only. Deeper playlist/analysis
  endpoints are pending audit against a live instance and are, in any case,
  gated by whether we ship a user-visible feature that needs them.
- **Last.fm** — `artist.getSimilar` today. Cheap read-only additions within the
  bundled-key model may be added. Authenticated Last.fm is **not ruled out** —
  see §7.3 for direct authenticated scrobbling, which is in scope.
- **Deezer** — used for shelves/search/previews; deepening (editorial charts,
  radio, wider `related`) is opportunistic, not a priority.
- **Lyrics** — server-only today. LRCLIB is a natural `lyrics` slot module
  (anonymous, no key), off by default like every external source (§10).

## 7. Auth model

Tiers declared per module in `AuthDescriptor`, so the settings UI and the
data-flow statement are generated, not hand-maintained:

```
'none'      — anonymous public API      (Deezer, MusicBrainz, LRCLIB, LB similar-artists graph)
'apiKey'    — server-issued key/token   (Lidarr, slskd, SoulSync, AudioMuse, ListenBrainz token)
'account'   — signed per-user session   (Last.fm authenticated scrobbling, §7.3, optional/off by default)
```

Rules:

1. **Anonymous tiers state what they leak.** "No account" still sends query
   contents (artist/title lookups) to the service; the per-module data-flow line
   covers this honestly.
2. **Secrets live in the OS keystore.** The mTLS identity set the precedent
   (`clientCertificateStore.ts`, expo-secure-store). Downloader API keys and the
   LB token currently persist in MMKV via redux-persist; migrate them to secure
   storage under the same pattern, one-time on upgrade, transparent to the user.
3. **Scrobble ownership is explicit (see §7.3).**
4. **Authentication is contextual and reusable.** A feature page can initiate the
   connection it needs. The connection is stored centrally and reusable by other
   features, but those features stay disabled until enabled independently.
   Authentication grants availability, not blanket permission.
5. **Multi-server scoping stays.** Downloader and integration configs are
   per-server (a home Navidrome and a remote Jellyfin may have different
   companion stacks).

### 7.3 Scrobbling routes

A listen can reach a destination (Last.fm, ListenBrainz) two ways: the server
forwards it, or yuzic sends it directly. Both at once = double listens,
corrupting the history recommendations depend on.

Scrobbling therefore supports **exactly one route per destination per server**:

```
Disabled | Through the server | Direct from Yuzic
```

- **Direct authenticated Last.fm scrobbling is in scope** as one of these routes,
  alongside the existing ListenBrainz-direct and server-forwarded routes.
- Settings > Scrobbling selects the route **per destination, per server**, and
  clearly explains the duplicate-scrobble risk when server-forwarding cannot be
  verified.
- Where the server can report its forwarding state, yuzic displays it; where it
  cannot, yuzic asks. It does **not** presume the server wins. (Claims about a
  server's forwarding config need verification before being shown as fact.)

## 8. Search

- **Default is library search.** External search requires an explicit action.
  (The exact wording is undecided; avoid "Search beyond your library.")
- External search covers all sources the user has enabled **specifically for
  search**, with a **narrowing source selector**. Home enablement does not grant
  Search; the two are enabled independently.
- Confident cross-source matches are merged with **visible provenance**;
  different editions/recordings and ambiguous matches are kept **separate**, not
  collapsed.

## 9. Metadata enrichment

One Metadata settings page with **distinct artist-information and artwork
controls**. Enrichment is **display-only**: enriched artist bios, images, and
artwork are cached in yuzic and shown in the UI. Yuzic **never writes** to server
tags or files. Disabling enrichment **restores the server's own view**. This is a
`metadata.enrich` capability, off by default like every external source (P2).

## 10. Lyrics

Lyrics is its own settings area, like Scrobbling. Sources are **explicit opt-in**,
with a **user-configurable priority/fallback chain** (yuzic tries enabled sources
in the user's order when a higher one has no result). Once configured, behavior
is automatic per settings — yuzic does not ask every song. This is
feature-specific fallback behavior, **not** a global provider-priority system.

## 11. Discovery, privacy-consistent

Off by default, useful anyway (P2):

- **Home is what changes; Library is what's complete.** Home carries a rich
  baseline from the local library, local play history, and server capabilities —
  **no external services required**, and it stays uncluttered and organized. Home
  does **not** advertise integration setup. Optional shelves are discovered and
  configured through **Settings > Home** with contextual Enable/Connect.
- **External discovery is off by default.** When enabled, external content
  appears in **separate shelves** by default; blending owned and external content
  is **explicit per mix**, never automatic.
- **Local-first Home mix**: play-stats + genres already on device, plus
  server-side similarity (`getSimilarSongs2`, which transparently includes
  whatever the user's server plugins provide). A private mix with zero external
  calls. We improve this using existing capabilities; we do **not** introduce a
  new generic mix-generator algorithm this pass (§14).
- Discovery output feeds Wants: every recommended unowned item is one tap from
  `wanted` (save-only) or an explicit Get.

## 12. Upgrade / migration

The upgrade migrates existing credentials, preferences, and already-enabled
behavior; **new capabilities stay off**. No setup reset. A brief notice explains
that some settings moved (into their feature-oriented homes and Connections).
Secret migration to the keystore (§7.2) happens once, transparently.

## 13. Slicing

Each phase ships alone and is useful without the ones after it.

| Phase | Contents | Depends on |
|---|---|---|
| **A. Entity model** | `LibraryState` on one row model; kill parallel external screens; stable local id + carried `ExternalIds`; matching separate from identity | — |
| **B. Module contract** | Converge sources + downloaders registries on `IntegrationModule`; schema-driven options (Lidarr knobs); secure-storage migration; generated Connections screen with data-flow lines; remove superseded per-service paths | A (soft) |
| **C. Wants + Get v1** | Want slice (save-only) + Get router + Wants screen and one Downloads screen (Offline/Downloaders sections, all-activity view); ask-by-default confirm; arrival verification; needs-attention linked to job | A, B |
| **D. Feature surfaces** | Scrobbling (one route per destination per server, incl. direct Last.fm); Lyrics fallback chain + LRCLIB; Metadata enrichment (display-only); Search source selector; Home settings | B |
| **E. Discovery deepening** | Local-first Home mix from existing capabilities; verified provider-surface additions from the audit; onboarding discovery prompt | B (C for want/Get taps) |

Open items to spike before/while building:

- SoulSync, AudioMuse, slskd, and Lidarr API audits against upstream docs/source
  and a live instance (what do their pipelines actually accept?) — **in progress**.
- Navidrome's reporting of server-side scrobble-forwarding config (for §7.3
  auto-detection vs. ask).
- Whether `MatchKey` needs duration, or artist+title(+album) suffices against a
  large real library.

## 14. Non-goals and deferred

**Out of scope this pass:**

- **Playlist import** — out entirely. No local playlist framework, no partial
  server copies, no pending-import workflow, no polling/following, no Import
  button or header tiles, no placeholder UI. If a future connection offers real
  playlist-transfer capability, it is designed then.
- **Chasing every downloader.** Adding one is a leaf module (P5); demand pulls
  them in.
- **Cross-server library merging.** Orthogonal; unchanged.

**Deferred (not now, revisit after the above proves out):**

- Smart-playlist / filter engines.
- Any new generic mix-generator algorithm.
- Playlist following.
- Artist-subscription wants (§5.4).
