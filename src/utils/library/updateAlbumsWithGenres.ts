import { AlbumData, GenreMaps } from '@/types';

export const updateAlbumsWithGenres = (albums: AlbumData[], genreMaps: GenreMaps): AlbumData[] => {
    return albums.map(album => ({
        ...album,
        genres:
            genreMaps.albumGenresMap?.[album.id] ||
            genreMaps.albumKeyGenresMap?.[`${album.title?.toLowerCase()}|${album.artist?.name?.toLowerCase()}`] ||
            [],
        songs: album.songs.map(song => ({
            ...song,
            genres: genreMaps.songGenresMap?.[song.id] || [],
        })),
    }));
};