import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { updateServer } from '@/utils/redux/slices/serversSlice';
import {
  listServerLibraries,
  selectedLibraryIds,
  libraryScopePatch,
  type Library,
} from '@/utils/servers/registry';
import { useSync } from '@/hooks/useSync';
import SettingsSelectCard from '../../components/SettingsSelectCard';

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
        const result = await listServerLibraries(activeServer);
        if (!cancelled) setLibraries(result);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeServer]);

  const selectedIds: string[] = useMemo(
    () => (activeServer ? selectedLibraryIds(activeServer) : []),
    [activeServer]
  );

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
    pendingSyncRef.current = true;
    dispatch(updateServer({
      id: activeServer.id,
      patch: { auth: { ...activeServer.auth, ...libraryScopePatch(activeServer, next) } as any },
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
