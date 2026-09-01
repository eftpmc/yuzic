import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from '@backpackapp-io/react-native-toast';

import { downloaderSelectors } from '@/utils/redux/selectors/downloadersSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import {
  connectDownloader,
  disconnectDownloader,
  setDownloaderApiKey,
  setDownloaderAuthenticated,
  setDownloaderServerUrl,
  type DownloaderId,
} from '@/utils/redux/slices/downloadersSlice';

/** Debounce before auto-testing typed credentials, so each keystroke isn't a request. */
const AUTO_CONNECT_DELAY_MS = 500;

export type DownloaderConfig = { serverUrl: string; apiKey: string };

/**
 * Credential state and connection testing for one downloader. Lidarr and slskd
 * differ only in which `testConnection` they call, so the auth effect, the
 * manual ping and the disconnect all live here rather than once per screen.
 */
export function useDownloaderConnection(
  id: DownloaderId,
  testConnection: (config: DownloaderConfig) => Promise<unknown>
) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const serverId = activeServer?.id ?? '';

  const selectors = downloaderSelectors[id];
  const serverUrl = useSelector(selectors.serverUrl);
  const apiKey = useSelector(selectors.apiKey);
  const isAuthenticated = useSelector(selectors.isAuthenticated);
  const config = useSelector(selectors.config);

  const [isLoading, setIsLoading] = useState(false);

  // See useDownloaderQueue: `t` is a ref so a changing identity can't restart
  // the debounced connection test on every render.
  const translate = useRef(t);
  translate.current = t;

  const setServerUrl = useCallback(
    (value: string) => dispatch(setDownloaderServerUrl({ serverId, downloader: id, value })),
    [dispatch, id, serverId]
  );
  const setApiKey = useCallback(
    (value: string) => dispatch(setDownloaderApiKey({ serverId, downloader: id, value })),
    [dispatch, id, serverId]
  );

  useEffect(() => {
    if (!serverUrl || !apiKey) {
      dispatch(setDownloaderAuthenticated({ serverId, downloader: id, value: false }));
      return;
    }
    if (isAuthenticated) return;

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        if (config.serverUrl && config.apiKey) {
          await testConnection(config);
          if (!cancelled) dispatch(connectDownloader({ serverId, downloader: id }));
        }
      } catch {
        if (!cancelled) {
          dispatch(setDownloaderAuthenticated({ serverId, downloader: id, value: false }));
          toast.error(translate.current(`settings.downloaders.${id}.connectionFailed`));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, AUTO_CONNECT_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [apiKey, config, dispatch, id, isAuthenticated, serverId, serverUrl, testConnection]);

  const ping = useCallback(async () => {
    if (!config.serverUrl || !config.apiKey || isLoading) return;
    setIsLoading(true);
    try {
      await testConnection(config);
      dispatch(connectDownloader({ serverId, downloader: id }));
    } catch {
      dispatch(setDownloaderAuthenticated({ serverId, downloader: id, value: false }));
      toast.error(t(`settings.downloaders.${id}.connectionFailed`));
    } finally {
      setIsLoading(false);
    }
  }, [config, dispatch, id, isLoading, serverId, t, testConnection]);

  const disconnect = useCallback(() => {
    dispatch(disconnectDownloader({ serverId, downloader: id }));
    toast(t(`settings.downloaders.${id}.disconnected`));
  }, [dispatch, id, serverId, t]);

  return {
    activeServer,
    serverUrl,
    apiKey,
    setServerUrl,
    setApiKey,
    isAuthenticated,
    isLoading,
    config,
    ping,
    disconnect,
  };
}
