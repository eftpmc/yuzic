import { createMediaBrowserClient, MediaBrowserClientConfig } from "../mediaBrowser/client";
import { EMBY_BRAND } from "../mediaBrowser/brand";

export type EmbyClientConfig = MediaBrowserClientConfig;

export type EmbyClient = ReturnType<typeof createEmbyClient>;

export function createEmbyClient(config: EmbyClientConfig) {
  return createMediaBrowserClient(config, EMBY_BRAND);
}
