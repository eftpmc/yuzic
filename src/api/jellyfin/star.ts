export const star = async (
    serverUrl: string,
    userId: string,
    token: string,
    itemId: string
) => {
    const response = await fetch(
        `${serverUrl}/Users/${userId}/FavoriteItems/${itemId}`,
        {
            method: 'POST',
            headers: {
                'Authorization': `MediaBrowser Token=${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    return response.ok;
};
