import { useSelector } from "react-redux";
import { ApiAdapter } from "./types";
import { createNavidromeAdapter } from "./navidrome";
import { createJellyfinAdapter } from "./jellyfin";
import { selectActiveServer } from "@/utils/redux/selectors/serversSelectors";

const empty = async () => {
  throw new Error("No server connected.");
};

export const useApi = (): ApiAdapter => {
  const activeServer = useSelector(selectActiveServer);

  if (!activeServer || !activeServer.isAuthenticated) {
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
      lyrics: {
        getBySongId: empty,
      },
      search: {
        search: empty
      }
    };
  }

  if (activeServer.type === "navidrome") {
    return createNavidromeAdapter(activeServer);
  }

  if (activeServer.type === "jellyfin") {
    return createJellyfinAdapter(activeServer);
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
    lyrics: {
      getBySongId: empty
    },
    search: {
      search: empty
    }
  };
};