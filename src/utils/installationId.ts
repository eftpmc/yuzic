import { nanoid } from '@reduxjs/toolkit';

import { mmkv } from '@/utils/mmkvStorage';

const KEY = 'app.installationId.v1';

/**
 * A stable per-install identifier, generated once and kept for the life of the
 * installation.
 *
 * Every server that tracks devices wants one, and each of them behaves badly
 * when it does not get a real one:
 *
 * - **Jellyfin / Emby** take it as `DeviceId` in the `X-Emby-Authorization`
 *   header. This was the literal string `yuzic-device` in three separate
 *   files, which meant every yuzic install on earth presented as the *same*
 *   device: one row in the server's device list, shared sessions, and one
 *   user's "sign out all devices" reaching into everyone else's.
 * - **Plex** takes it as `X-Plex-Client-Identifier` and keys its Authorized
 *   Devices list on it, so a value generated per launch would add an entry
 *   every single time the app opened.
 *
 * Persisted in MMKV rather than derived from anything about the hardware:
 * a derived id would be stable for the wrong reason (it would follow the
 * device across a reinstall, and could collide between two installs on the
 * same model), and reading real device identifiers is a privacy question we
 * have no reason to open. A random id answers "which install am I talking
 * to" exactly, and nothing else.
 *
 * Read through `getInstallationId()` — it is synchronous, because the call
 * sites are header builders that cannot await.
 */
export function getInstallationId(): string {
  const existing = mmkv.getString(KEY);
  if (existing) return existing;

  const created = nanoid();
  mmkv.set(KEY, created);
  return created;
}
