export const addPlaylistItems = async (
    serverUrl: string,
    playlistId: string,
    userId: string,
    token: string,
    itemIds: string[]
) => {
    const idsParam = itemIds.join(',');
    const url = `${serverUrl}/Playlists/${playlistId}/Items?Ids=${idsParam}&UserId=${userId}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'X-Emby-Token': token, 'Content-Type': 'application/json' },
    });

    if (!response.ok) return false;

    return true;
};

export const removePlaylistItems = async (
    serverUrl: string,
    playlistId: string,
    token: string,
    entryIds: string[]
) => {
    const idsParam = entryIds.join(',');
    const url = `${serverUrl}/Playlists/${playlistId}/Items?EntryIds=${idsParam}`;

    const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'X-Emby-Token': token, 'Content-Type': 'application/json' },
    });

    if (!response.ok) return false;

    return true;
};
