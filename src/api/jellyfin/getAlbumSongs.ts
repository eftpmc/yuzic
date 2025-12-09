export const getAlbumSongs = async (
    serverUrl: string,
    token: string,
    albumId: string
) => {
    const response = await fetch(
        `${serverUrl}/Items?ParentId=${albumId}` +
        `&IncludeItemTypes=Audio&Recursive=true&SortBy=IndexNumber&` +
        `Fields=Path,MediaSources,RunTimeTicks,Genres,Album,AlbumArtist,PlayCount`,
        { headers: { 'X-Emby-Token': token } }
    );

    if (!response.ok) return null;

    const json = await response.json();
    return json?.Items || [];
};
