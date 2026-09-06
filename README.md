<img alt='Yuzic' src="/assets/images/logo.png" width="40" />

  [![Latest Version](https://img.shields.io/github/package-json/version/eftpmc/yuzic?label=Latest%20Version&color=orange)](https://github.com/eftpmc/yuzic/releases) [![iTunes App Store](https://img.shields.io/itunes/v/6740042497?logo=app-store&logoColor=white&label=Apple%20App%20Store&labelColor=%60&color=blue)](https://apps.apple.com/us/app/yuzic-navidrome-jellyfin/id6740042497) [![Google Play](https://img.shields.io/badge/Google%20Play-Download-red?logo=googleplay&logoColor=white)](https://play.google.com/store/apps/details?id=com.arinora.rawarr) [![Discord](https://img.shields.io/discord/1417549384127610932?label=Discord)](https://discord.gg/NzsGEhg5Fs)

## Contents

- [Info](#info)
- [Download](#download)
- [Features](#features)
- [Servers](#servers)
- [Integrations](#integrations)
- [Downloaders](#downloaders)
- [Documentation](#documentation)
- [Future](#future)
- [Screenshots](#screenshots)
- [Where are downloads stored?](#where-are-downloads-stored)
- [Contribution](#contribution)

## Info
Yuzic is a cross platform opensource music player for Navidrome, Jellyfin, and Emby. Built with React Native and Expo.

This project started in December of 2024. The goal of this app is to encompass all of your music needs in relation to your server. I have a huge appreciation for UI and UX, and minimal interfaces. That's the approach I took for this app.

Yuzic provides a Navidrome demo but requires a self-hosted Subsonic, Jellyfin, or Emby server to function as intended.

## Download

### IOS

[![iTunes App Store](https://img.shields.io/itunes/v/6740042497?logo=app-store&logoColor=white&label=Apple%20App%20Store&labelColor=%60&color=blue)](https://apps.apple.com/us/app/yuzic-navidrome-jellyfin/id6740042497)

[IPA](https://github.com/eftpmc/yuzic/releases)

### Android

[![Google Play](https://img.shields.io/badge/Google%20Play-Download-red?logo=googleplay&logoColor=white)](https://play.google.com/store/apps/details?id=com.arinora.rawarr)

[APK](https://github.com/eftpmc/yuzic/releases)

## Features

- **Unified library across servers** — connect several servers and switch
  between them; the library, queue, and downloads are scoped per server.
- **Offline & downloads** — download songs, albums, and playlists to the
  device; edits made offline replay when you're back online.
- **Playback** — streaming with per-network quality (up to lossless),
  equalizer, sleep timer, playback speed, autoplay, and resume for long tracks.
- **Radio, podcasts, and shares** — where your server supports them.
- **Play it elsewhere** — DLNA/UPnP renderers on the local network, AirPlay on
  iOS, or the server's own speakers where it offers a jukebox.
- **Search & browsing** — on-device or server-side search, sortable library
  collections, genres, and a Home built from what's changing.
- **Customisable UI** — light/dark/system, accent colour, corner radius, list
  density, grid columns, and artwork-tinted screens.
- **Localised** — English, French, Japanese, and Chinese.
- **Privacy-first** — every outside service is off until you turn it on.

## Servers

You need one music server. Navidrome (or any Subsonic-compatible server),
Jellyfin, and Emby are supported; Navidrome also has a built-in public demo you
can try the app against without hosting anything.

| Server | Auth | Demo | Radio | Podcasts | Shares | Queue sync | Resume positions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Navidrome / Subsonic | Username + password | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Jellyfin | Username + password | — | — | — | — | — | ✅ |
| Emby | Username + password | — | — | — | — | — | ✅ |

Provider-only surfaces are hidden rather than shown broken — a Jellyfin user
doesn't get a Radio row that goes nowhere.

## Integrations

All optional, all off until you turn them on, all under
**Settings → Integrations**.

| Integration | Account needed | What it adds |
| --- | --- | --- |
| Deezer | No | Discovery shelves, search results, external artist/album pages, top tracks, similar artists, recommendations, 30s previews |
| MusicBrainz | No | Canonical artist and album metadata for things not in your library |
| Last.fm | No | Similar artists and playlist-recommendation seeds |
| ListenBrainz | Token, for scrobbling | Scrobbling and now-playing; separately, the public similar-artist graph for discovery |
| AudioMuse-AI | Self-hosted instance | Acoustic-similarity autoplay and playlist generation |

## Downloaders

Optional, self-hosted, configured per server under **Settings → Downloaders**.
These add music to *your server* — separate from offline downloads, which copy
music you already have onto this device.

| Downloader | Albums | Tracks | Needs |
| --- | --- | --- | --- |
| [Lidarr](https://lidarr.audio) | ✅ | — | Server URL + API key |
| [slskd](https://github.com/slskd/slskd) (Soulseek) | ✅ | ✅ | Server URL + API key |

## Documentation

| Doc | What's in it |
| --- | --- |
| [docs/integrations.md](docs/integrations.md) | Every server, integration, and downloader — what it needs, every endpoint we call, and what we deliberately don't |
| [docs/architecture.md](docs/architecture.md) | The four load-bearing patterns: `ApiAdapter`, `playbackSlice`, `contentKind`, `useSync` |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Local setup, tests, branch model |
| [AGENTS.md](AGENTS.md) | Release/version rules and the app's UI conventions |

## Future
- Crossfading
- Apple TV app
- Apple watch
- F-droid
- Plex
- Lyrion

## Screenshots

Screenshots taken on iPhone 13.

<details>
<summary>Show screenshots</summary>

### Home

<p align="center">
  <img src="screenshots/home.png" alt="Yuzic Home Page" width="275" height="600">
</p>

### Library

<p align="center">
  <img src="screenshots/library.png" alt="Yuzic Library Page" width="275" height="600">
</p>

### Playing

<p align="center">
  <img src="screenshots/playing-screen.png" alt="Yuzic Playing" width="275" height="600">
  <img src="screenshots/playing-queue.png" alt="Yuzic Queue" width="275" height="600">
</p>

### Album

<p align="center">
  <img src="screenshots/album-screen.png" alt="Yuzic Album" width="275" height="600">
  <img src="screenshots/album1.png" alt="Yuzic Album 1" width="275" height="600">
</p>

### Artist

<p align="center">
  <img src="screenshots/artist-screen.png" alt="Yuzic Artist" width="275" height="600">
  <img src="screenshots/artist1.png" alt="Yuzic Artist 1" width="275" height="600">
</p>

### Playlist

<p align="center">
  <img src="screenshots/playlist-screen.png" alt="Yuzic Playlist" width="275" height="600">
  <img src="screenshots/playlist1.png" alt="Yuzic Playlist 1" width="275" height="600">
</p>

### Onboarding

<p align="center">
  <img src="screenshots/get-started.png" alt="Yuzic Get Started" width="275" height="600">
  <img src="screenshots/servers.png" alt="Yuzic Servers" width="275" height="600">
  <img src="screenshots/servertype.png" alt="Yuzic Server Type" width="275" height="600">
  <img src="screenshots/serveraddress.png" alt="Yuzic Server Address" width="275" height="600">
  <img src="screenshots/credentials-screen.png" alt="Yuzic Credentials" width="275" height="600">
  <img src="screenshots/chooselibrary.png" alt="Yuzic Choose Library" width="275" height="600">
</p>

### Search

<p align="center">
  <img src="screenshots/search.png" alt="Yuzic Search Empty" width="275" height="600">
  <img src="screenshots/search1.png" alt="Yuzic Search Results" width="275" height="600">
</p>

### Settings

<p align="center">
  <img src="screenshots/settings-screen.png" alt="Yuzic Settings" width="275" height="600">
  <img src="screenshots/settings-server.png" alt="Yuzic Server Settings" width="275" height="600">
  <img src="screenshots/settings-library.png" alt="Yuzic Library Settings" width="275" height="600">
  <img src="screenshots/settings-downloaddetails.png" alt="Yuzic Download Details" width="275" height="600">
  <img src="screenshots/settings-playback.png" alt="Yuzic Player Settings" width="275" height="600">
  <img src="screenshots/settings-appearance.png" alt="Yuzic Appearance Settings" width="275" height="600">
</p>

### Integrations

<p align="center">
<img src="screenshots/settings-integrations.png" alt="Yuzic Integrations" width="275" height="600">
<img src="screenshots/settings-deezer.png" alt="Yuzic Deezer" width="275" height="600">
<img src="screenshots/settings-musicbrainz.png" alt="Yuzic Musicbrainz" width="275" height="600">
<img src="screenshots/settings-lastfm.png" alt="Yuzic Lastfm" width="275" height="600">
<img src="screenshots/settings-listenbrainz.png" alt="Yuzic Listenbrainz" width="275" height="600">
</p>

### Downloaders

<p align="center">
  <img src="screenshots/settings-downloaders.png" alt="Yuzic Downloaders" width="275" height="600">
  <img src="screenshots/settings-lidarr.png" alt="Yuzic Lidarr" width="275" height="600">
  <img src="screenshots/settings-slskd.png" alt="Yuzic slskd" width="275" height="600">
</p>

</details>

## Where are downloads stored?

Offline downloads (songs/albums/playlists you download for offline playback) are stored in the app's private storage, not somewhere your device's file manager or Files app can browse to. To view or remove them, go to **Settings → Library → Downloads**.

## Contribution
Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup and how PRs get merged, or open an issue to discuss a change first.
