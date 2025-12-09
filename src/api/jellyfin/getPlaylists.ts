export const getPlaylists = async (
    serverUrl: string,
    userId: string,
    token: string
) => {
    const response = await fetch(
        `${serverUrl}/Users/${userId}/Items?IncludeItemTypes=Playlist&Recursive=true&Fields=Id,Name`,
        { headers: { 'X-Emby-Token': token, 'Content-Type': 'application/json' } }
    );

    if (!response.ok) return null;

    const json = await response.json();
    return json.Items || [];
};
