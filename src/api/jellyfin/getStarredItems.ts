export const getStarredItems = async (
    serverUrl: string,
    userId: string,
    token: string
) => {
    const url =
        `${serverUrl}/Users/${userId}/Items?Recursive=true&Filters=IsFavorite&IncludeItemTypes=` +
        `Audio,MusicAlbum,MusicArtist&Fields=Path`;

    const response = await fetch(url, {
        headers: { 'X-Emby-Token': token }
    });

    if (!response.ok) return null;

    const json = await response.json();
    return json.Items || [];
};
