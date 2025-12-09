import { scrobbleTrack } from '@/api/navidrome/scrobbleTrack';

export const scrobble = async (
    songId: string,
    serverUrl: string,
    username: string,
    password: string,
    isSubmission = false
) => {
    return await scrobbleTrack(
        serverUrl,
        username,
        password,
        songId,
        isSubmission
    );
};