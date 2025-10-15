export const updateNowPlaying = async (
    songId: string,
    serverUrl: string,
    userId: string,
    username: string,
    password: string
) => {
    const songUrl = `${serverUrl}/rest/getSong.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
        password
    )}&v=1.16.0&c=NavidromeApp&f=json&id=${encodeURIComponent(songId)}`;

    try {
        const res = await fetch(songUrl);
        const json = await res.json();

        const song = json['subsonic-response']?.song;

        if (song && typeof song === 'object') {
            const payload = {
                userId,
                artist: song.artist,
                track: song.title,
                album: song.album || null,
                path: song.path || null, // ✅ Include path here
            };

            await fetch('https://rawarr-server-af0092d911f6.herokuapp.com/api/nowplaying', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log('[NowPlaying Updated]', payload);
        } else {
            console.warn('[updateNowPlaying] Invalid song response:', json);
        }
    } catch (err) {
        console.error('[updateNowPlaying Error]', err);
    }
};