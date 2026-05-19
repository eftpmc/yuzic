import { useMemo } from "react";
import { useSelector } from "react-redux";
import { ApiAdapter } from "./types";
import { SERVER_PROVIDERS } from "@/utils/servers/registry";
import { selectActiveServer } from "@/utils/redux/selectors/serversSelectors";

const empty = async () => {
  throw new Error("No server connected.");
};

const EMPTY_ADAPTER: ApiAdapter = {
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
    list: empty,
  },
  playlists: {
    list: async () => [],
    get: empty,
    create: empty,
    addSong: empty,
    removeSong: empty,
    delete: empty,
  },
  starred: {
    list: empty,
    add: empty,
    remove: empty,
  },
  songs: {
    get: async () => null,
    scrobble: async () => {},
    buildStreamUrl: () => '',
  },
  tracks: {
    list: async () => [],
    get: async () => null,
  },
  similar: {
    getSimilarSongs: async () => [],
  },
  lyrics: {
    getBySongId: empty,
  },
  search: {
    search: async () => ({ albums: [], artists: [], songs: [] })
  }
};

export const useApi = (): ApiAdapter => {
  const activeServer = useSelector(selectActiveServer);

  return useMemo(() => {
    if (!activeServer || !activeServer.isAuthenticated) return EMPTY_ADAPTER;
    return SERVER_PROVIDERS[activeServer.type]?.createAdapter(activeServer) ?? EMPTY_ADAPTER;
  }, [activeServer]);
};
