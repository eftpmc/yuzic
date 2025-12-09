export const getArtistInfo = async (artistName: string) => {
    try {
        const response = await fetch(
            `https://rawarr-server-af0092d911f6.herokuapp.com/api/lastfm/artist?name=${encodeURIComponent(
                artistName
            )}`
        );

        const data = await response.json();
        return {
            albums: data.albums || [],
            bio: data.bio || null
        };
    } catch (error) {
        console.warn(`❌ Failed to fetch Last.fm data for "${artistName}":`, error);
        return { albums: [], bio: null };
    }
};
