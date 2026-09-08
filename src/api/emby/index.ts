import { ApiAdapter } from "../types";
import { Server } from "@/types";

import { EMBY_BRAND } from "../mediaBrowser/brand";
import { createMediaBrowserAdapter } from "../mediaBrowser/adapter";

/** Emby is the MediaBrowser adapter with Emby's brand — see
 *  `api/mediaBrowser/adapter.ts`. */
export const createEmbyAdapter = (server: Server): ApiAdapter =>
  createMediaBrowserAdapter(server, EMBY_BRAND);
