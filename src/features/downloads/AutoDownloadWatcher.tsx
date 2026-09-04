import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTranslation } from 'react-i18next';
import { useDownloadActions, useDownloadState } from '@/contexts/DownloadContext';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectAutoDownloadNewSongs } from '@/utils/redux/selectors/settingsSelectors';
import { selectLibraryTracks } from '@/utils/redux/selectors/librarySelectors';
import type { Song } from '@/types';

/**
 * Watches the synced library track list and auto-downloads additions when the
 * setting is enabled (#130). The known-ID baseline (re)initializes on first
 * population and on server switch, so a wholesale list swap — fresh install,
 * rehydration, changing servers — never triggers a mass download; only tracks
 * that appear after a baseline exists count as new.
 */
export function AutoDownloadWatcher() {
  const { t } = useTranslation();
  const enabled = useSelector(selectAutoDownloadNewSongs);
  const activeServer = useSelector(selectActiveServer);
  const tracks = useSelector(selectLibraryTracks);
  const { downloadTracks } = useDownloadActions();
  const { isTrackDownloaded } = useDownloadState();
  const knownRef = useRef<{ serverId: string | null; ids: Set<string> | null }>({
    serverId: null,
    ids: null,
  });

  useEffect(() => {
    const serverId = activeServer?.id ?? null;
    const prev = knownRef.current;
    const ids = new Set(tracks.map(track => track.id));

    if (prev.serverId !== serverId || prev.ids === null || prev.ids.size === 0) {
      knownRef.current = { serverId, ids };
      return;
    }

    const known = prev.ids;
    knownRef.current = { serverId, ids };

    if (!enabled) return;
    const newTracks = tracks.filter(track => !known.has(track.id) && !isTrackDownloaded(track.id));
    if (!newTracks.length) return;

    // The queue resolves each track's fresh stream URL by id, so the base
    // entries from the library list are enough to enqueue.
    const songs: Song[] = newTracks.map(track => ({ ...track, streamUrl: '' }));
    void downloadTracks(songs);
    toast(t('settings.library.downloads.autoDownloadStarted', { count: songs.length }));
  }, [tracks, activeServer?.id, enabled, downloadTracks, isTrackDownloaded, t]);

  return null;
}
