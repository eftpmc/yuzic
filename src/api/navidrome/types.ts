/**
 * Raw shapes returned by Navidrome's Subsonic-compatible REST API. Only the
 * fields this adapter actually reads are modeled; everything is optional
 * since Subsonic servers omit absent fields rather than nulling them.
 */
export interface SubsonicGenreRef {
  name?: string;
}

export interface SubsonicSong {
  id?: string;
  title?: string;
  artist?: string;
  artistId?: string;
  albumId?: string;
  coverArt?: string;
  duration?: number;
  path?: string;
  bitRate?: number;
  samplingRate?: number;
  bitDepth?: number;
  contentType?: string;
  year?: number;
  discNumber?: number;
  track?: number;
  created?: string;
  played?: string;
  playCount?: number;
  bpm?: number;
  genre?: string;
  genres?: (SubsonicGenreRef | string)[];
}

export interface SubsonicAlbum {
  id?: string;
  name?: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  year?: number;
  genre?: string;
  created?: string;
  song?: SubsonicSong[];
}

/** Shape returned by the non-ID3 getAlbumList/getStarred `album` entries (titled "title", not "name"). */
export interface SubsonicAlbumListEntry {
  id?: string;
  title?: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  year?: number;
  genre?: string;
  created?: string;
  songCount?: number;
  playCount?: number;
  played?: string;
}

/** Shape returned by search3's ID3-based `album` entries (uses "name", not "title"). */
export interface SubsonicSearchAlbumEntry {
  id?: string;
  name?: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  year?: number;
  genre?: string;
  created?: string;
}

export interface SubsonicArtist {
  id?: string;
  name?: string;
  coverArt?: string;
}

export interface SubsonicArtistIndex {
  artist?: SubsonicArtist[];
}

export interface SubsonicGenreEntry {
  value?: string;
}

export interface SubsonicPlaylist {
  id?: string;
  name?: string;
  coverArt?: string;
  changed?: string;
  created?: string;
  entry?: SubsonicSong[];
}

export interface SubsonicMusicFolder {
  id?: string | number;
  name?: string;
  title?: string;
}

export interface SubsonicError {
  code?: number;
  message?: string;
}

export interface SubsonicResponseBody {
  status?: string;
  error?: SubsonicError;
  song?: SubsonicSong;
  album?: SubsonicAlbum;
  artist?: SubsonicArtist;
  artists?: { index?: SubsonicArtistIndex[] };
  albumList?: { album?: SubsonicAlbumListEntry[] };
  genres?: { genre?: SubsonicGenreEntry[] };
  musicFolders?: { musicFolder?: SubsonicMusicFolder | SubsonicMusicFolder[] };
  playlists?: { playlist?: SubsonicPlaylist[] };
  playlist?: SubsonicPlaylist & { id?: string; playlistId?: string };
  playlistId?: string;
  starred?: { album?: SubsonicAlbumListEntry[]; song?: SubsonicSong[] };
  albumInfo?: {
    notes?: string;
    musicBrainzId?: string;
    lastFmUrl?: string;
  };
  similarSongs?: { song?: SubsonicSong[] };
  internetRadioStations?: {
    internetRadioStation?: Array<{
      id?: string;
      name?: string;
      streamUrl?: string;
      homepageUrl?: string;
    }>;
  };
  shares?: {
    share?: Array<{
      id?: string;
      url?: string;
      description?: string;
      created?: string;
      expires?: string;
      visitCount?: number;
    }>;
  };
  artistInfo2?: {
    biography?: string;
    musicBrainzId?: string;
    lastFmUrl?: string;
    similarArtist?: Array<{
      id?: string;
      name?: string;
      coverArt?: string;
      albumCount?: number;
    }>;
  };
  searchResult3?: {
    album?: SubsonicSearchAlbumEntry[];
    artist?: SubsonicArtist[];
    song?: SubsonicSong[];
  };
  scanStatus?: { scanning?: string };
}

export interface SubsonicResponse {
  "subsonic-response"?: SubsonicResponseBody;
}
