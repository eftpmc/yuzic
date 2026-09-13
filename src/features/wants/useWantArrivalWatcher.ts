import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { notify } from '@/components/toast';
import { useTranslation } from 'react-i18next';

import { useLibrary } from '@/contexts/LibraryContext';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { selectWantsForActiveServer } from '@/utils/redux/selectors/wantsSelectors';
import { removeWant } from '@/utils/redux/slices/wantsSlice';
import { findArrivedWants } from './arrival';

/**
 * Watches the synced library for wants that have actually arrived and
 * resolves them — presence in the library is the only signal, never a
 * downloader job/queue state. Mount once (alongside `DownloadersQueueProvider`
 * in the home layout): the queue's own poll/staggered-sync loop is what
 * causes a server rescan, and *this* hook is what notices the result landing
 * in the synced library and reacts to it. It never drives or touches that
 * loop itself.
 *
 * Arrival is intentionally not gated on `jobRef` — an entity that shows up
 * in the library by any route (a Get that completed, a manual copy, a
 * Bandcamp download dropped in by hand) resolves the want. There is
 * deliberately no separate "Arrived" collection; Recently Added already
 * covers that, so a resolved want is simply removed from the active list
 * with a brief notification.
 */
export function useWantArrivalWatcher(): void {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const activeServerId = useSelector(selectActiveServerId);
  const wants = useSelector(selectWantsForActiveServer);
  const { albums, tracks } = useLibrary();

  // Guards against re-firing the toast/removal for a want already resolved
  // in this session — `removeWant` is itself idempotent-safe, but without
  // this the effect could still fire once per re-render before the removal
  // is reflected back through the selector.
  const resolvedRef = useRef<Set<string>>(new Set());

  // A server switch invalidates any previously-resolved localIds — they were
  // scoped to the server that had them, and a different server's wants use
  // localIds independently.
  const prevServerIdRef = useRef<string | null | undefined>(activeServerId);
  if (prevServerIdRef.current !== activeServerId) {
    prevServerIdRef.current = activeServerId;
    resolvedRef.current = new Set();
  }

  useEffect(() => {
    if (!activeServerId || wants.length === 0) return;

    const candidates = wants.filter((want) => !resolvedRef.current.has(want.localId));
    if (candidates.length === 0) return;

    const arrived = findArrivedWants(candidates, { albums, tracks });
    if (arrived.length === 0) return;

    for (const want of arrived) {
      resolvedRef.current.add(want.localId);
      dispatch(removeWant({ serverId: activeServerId, localId: want.localId }));
      notify.success(t('externalAlbum.menu.arrived', { title: want.title }));
    }
  }, [activeServerId, wants, albums, tracks, dispatch, t]);
}
