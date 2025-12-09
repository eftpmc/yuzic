export const getSongsByGenre = async (
    serverUrl: string,
    token: string,
    genre: string
) => {
    const response = await fetch(
        `${serverUrl}/Items?IncludeItemTypes=Audio&Genres=${encodeURIComponent(genre)}`,
        { headers: { 'X-Emby-Token': token } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.Items || [];
};