/**
 * An enum of all the keys of query functions.
 */
export enum QueryKeys {
	Album = 'album',
	Albums = 'albums',
	Artist = 'artist',
	Artists = 'artists',
	Playlist = 'playlist',
	Playlists = 'playlists',
	Song = 'song',
	Tracks = 'tracks',
	Starred = 'starred',
	RecentSongs = 'recent-songs',
	Genres = 'genres',
	ExternalAlbum = 'external-album',
	ExternalArtist = 'external-artist-v2',
	ExploreSimilarArtists = 'explore-similar-artists',
	ExploreSimilarArtistAlbums = 'explore-similar-artist-albums',
	ExploreSimilarContent = 'explore-similar-content',
	SimilarArtists = 'server-similar-artists',
	SimilarAlbums = 'server-similar-albums',
	Bookmarks = 'server-bookmarks',
	/** v2: the entry became { songs, themed } — the persisted cache outlives an
	 * app upgrade, and a v1 array read through the new shape is an empty shelf. */
	ServerRandom = 'server-random-shelf-v2',
	/** v2: entries carry a resolved `cover` where they used to carry a raw
	 * `coverArt` id. Same reason as above — persisted v1 rows have no cover. */
	ServerNowPlaying = 'server-now-playing-v2',
	LbSimilarForYou = 'lb-similar-for-you',
	ArtistMbid = 'artist-mbid-lookup',
	Podcasts = 'server-podcasts',
	ExploreGenreRow = 'explore-genre-row',
	ExternalAlbumPreviews = 'external-album-previews',
	LidarrQueue = 'lidarr-queue',
	SlskdQueue = 'slskd-queue',
	RecommendedLocalSongs = 'recommended-local-songs',
	RecommendedExternalSongs = 'recommended-external-songs',
	ExploreBecauseYouListened = 'explore-because-you-listened',
	ExploreDeezerCharts = 'explore-deezer-charts',
	ExploreTopArtists = 'explore-top-artists',
	LocalArtistTopTracks = 'local-artist-top-tracks',
	LocalArtistExternalDiscography = 'local-artist-external-discography',
}
