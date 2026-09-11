import { getInstallationId } from './installationId';
import { mmkv } from './mmkvStorage';

describe('getInstallationId', () => {
  beforeEach(() => {
    mmkv.remove('app.installationId.v1');
  });

  it('returns the same id across calls', () => {
    expect(getInstallationId()).toBe(getInstallationId());
  });

  it('persists the generated id so a relaunch reuses it', () => {
    const first = getInstallationId();
    expect(mmkv.getString('app.installationId.v1')).toBe(first);
  });

  it('is not the shared literal every install used to send', () => {
    // Three call sites hardcoded `yuzic-device`, so every install presented as
    // the same device to Jellyfin/Emby. Guard the regression by name.
    expect(getInstallationId()).not.toBe('yuzic-device');
  });

  it('generates a distinct id for a fresh install', () => {
    const first = getInstallationId();
    mmkv.remove('app.installationId.v1');
    expect(getInstallationId()).not.toBe(first);
  });
});
