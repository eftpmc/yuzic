export const getLastFmTrackStats = async (
    artist: string,
    title: string
) => {
    const url =
        `https://rawarr-server-af0092d911f6.herokuapp.com/api/lastfm/track` +
        `?artist=${encodeURIComponent(artist)}` +
        `&title=${encodeURIComponent(title)}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    return response.json();
};