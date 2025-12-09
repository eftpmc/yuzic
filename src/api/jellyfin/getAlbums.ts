export const getAlbums = async (serverUrl: string, token: string) => {
    const response = await fetch(
        `${serverUrl}/Items?IncludeItemTypes=MusicAlbum&Recursive=true&SortBy=SortName&Fields=` +
        `PrimaryImageAspectRatio,ProductionYear,Genres,ParentId,Path,DateCreated,MediaSources`,
        { headers: { 'X-Emby-Token': token } }
    );

    if (!response.ok) return null;

    const json = await response.json();
    return json?.Items || [];
};
