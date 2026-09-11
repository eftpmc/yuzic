import { getInstallationId } from '@/utils/installationId';

/**
 * The `X-Emby-Authorization` header value MediaBrowser servers expect.
 *
 * Built per call rather than held in a module constant because `DeviceId` is
 * read from storage — see `utils/installationId.ts` for why it must be a real
 * per-install value and not the shared literal this used to be.
 */
export function mediaBrowserClientHeader(): string {
  return `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="${getInstallationId()}", Version="1.0.0"`;
}
