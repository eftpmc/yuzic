export const getArtistAlbums = async (
    serverUrl: string,
    token: string,
    artistId: string
) => {
    const response = await fetch(
        `${serverUrl}/Items?ArtistIds=${artistId}&IncludeItemTypes=MusicAlbum&Recursive=true` +
        `&SortBy=ProductionYear,SortName&Fields=PrimaryImageAspectRatio,Genres,Path,DateCreated,UserData`,
        { headers: { 'X-Emby-Token': token } }
    );

    if (!response.ok) return null;

    const json = await response.json();
    return json?.Items || [];
};