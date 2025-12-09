export const getPlaylistItems = async (
    serverUrl: string,
    playlistId: string,
    userId: string,
    token: string
) => {
    const response = await fetch(
        `${serverUrl}/Playlists/${playlistId}/Items?userId=${userId}`,
        { headers: { 'X-Emby-Token': token, 'Content-Type': 'application/json' } }
    );

    if (!response.ok) return null;

    const json = await response.json();
    return json.Items || [];
};