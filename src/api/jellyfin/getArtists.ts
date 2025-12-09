export const getArtists = async (serverUrl: string, token: string) => {
    const response = await fetch(
        `${serverUrl}/Items?IncludeItemTypes=MusicArtist&Recursive=true&SortBy=SortName&Fields=` +
        `PrimaryImageAspectRatio,Overview,Genres,Path,DateCreated`,
        { headers: { 'X-Emby-Token': token } }
    );

    if (!response.ok) return null;

    const json = await response.json();
    return json?.Items || [];
};
