import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { updateServer } from '@/utils/redux/slices/serversSlice';
import { getMusicFolders } from '@/api/navidrome/auth/getMusicFolders';
import { getMusicLibraries } from '@/api/jellyfin/auth/getMusicLibraries';
import { useSync } from '@/hooks/useSync';
import SettingsSelectCard from '../../components/SettingsSelectCard';

type Library = { id: string; name: string };

const LibrarySelect: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const { sync, isSyncing } = useSync();
  const pendingSyncRef = useRef(false);

  const [libraries, setLibraries] = useState<Library[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeServer) return;
    let cancelled = false;
    setIsLoading(true);
    const load = async () => {
      try {
        let result: Library[] = [];
        if (activeServer.type === 'navidrome') {
          result = await getMusicFolders(activeServer);
        } else if (activeServer.type === 'jellyfin') {
          result = await getMusicLibraries(activeServer);
        }
        if (!cancelled) setLibraries(result);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeServer]);

  const selectedIds: string[] = useMemo(() => {
    if (!activeServer) return [];
    if (activeServer.type === 'navidrome') {
      const v = activeServer.auth?.musicFolderIds;
      if (Array.isArray(v)) return v as string[];
      const old = activeServer.auth?.musicFolderId;
      return old ? [String(old)] : [];
    }
    const v = activeServer.auth?.parentIds;
    if (Array.isArray(v)) return v as string[];
    const old = (activeServer.auth as any)?.parentId;
    return old ? [String(old)] : [];
  }, [activeServer]);

  useEffect(() => {
    if (!pendingSyncRef.current || !activeServer?.id) return;
    pendingSyncRef.current = false;
    sync(true);
  }, [activeServer?.id, selectedIds, sync]);

  if (!activeServer) return null;

  const isAll = selectedIds.length === 0;
  const items = [
    { key: '__all__', label: t('settings.library.librarySelect.all') },
    ...libraries.map(l => ({ key: l.id, label: l.name })),
  ];

  const handleSelect = (key: string) => {
    let next: string[];
    if (key === '__all__') {
      next = [];
    } else {
      next = selectedIds.includes(key)
        ? selectedIds.filter(s => s !== key)
        : [...selectedIds, key];
    }
    const authPatch = activeServer.type === 'navidrome'
      ? { musicFolderIds: next }
      : { parentIds: next };
    pendingSyncRef.current = true;
    dispatch(updateServer({
      id: activeServer.id,
      patch: { auth: { ...activeServer.auth, ...authPatch } as any },
    }));
  };

  return (
    <SettingsSelectCard
      title={t('settings.library.librarySelect.info')}
      items={items}
      isSelected={key => key === '__all__' ? isAll : selectedIds.includes(key)}
      onSelect={handleSelect}
      multiSelect
      isLoading={isLoading}
      disabled={isSyncing}
    />
  );
};

export default LibrarySelect;
