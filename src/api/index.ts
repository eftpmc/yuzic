import { useSelector } from "react-redux";
import { RootState } from "@/utils/redux/store";
import { ApiAdapter } from "./types";
import { createNavidromeAdapter } from "./navidrome";
import { createJellyfinAdapter } from "./jellyfin";

const empty = async () => {
    throw new Error("No server connected.");
};

export const useApi = (): ApiAdapter => {
    const { type, serverUrl, username, password, token, userId } =
    useSelector((s: RootState) => s.server);

    if (type === "navidrome") {
        return createNavidromeAdapter({serverUrl, username, password, token, userId});
    }

    if (type === "jellyfin") {
        return createJellyfinAdapter({serverUrl, username, password, token, userId});
    }

    return {
        auth: {
            connect: empty,
            ping: empty,
            testUrl: empty,
            startScan: empty,
            disconnect: empty,
        },
        albums: {
            list: async () => [],
            get: empty,
        },
        artists: {
            list: async () => [],
            get: empty,
        },
        genres: {
            list: empty
        },
        playlists: {
            list: async () => [],
            get: empty,
            create: empty,
            addSong: empty,
            removeSong: empty,
        },
        starred: {
            list: empty,
            add: empty,
            remove: empty,
        },
        scrobble: {
            submit: empty,
        },
        stats: {
            list: async () => ({}),
        },
        search: {
            all: async () => ({
                songs: [],
                albums: [],
                artists: [],
            }),
        },
    };
};