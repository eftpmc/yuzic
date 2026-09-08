import { ApiAdapter } from "../types";
import { Server } from "@/types";

import { JELLYFIN_BRAND } from "../mediaBrowser/brand";
import { createMediaBrowserAdapter } from "../mediaBrowser/adapter";

/** Jellyfin is the MediaBrowser adapter with Jellyfin's brand — see
 *  `api/mediaBrowser/adapter.ts`. */
export const createJellyfinAdapter = (server: Server): ApiAdapter =>
  createMediaBrowserAdapter(server, JELLYFIN_BRAND);
