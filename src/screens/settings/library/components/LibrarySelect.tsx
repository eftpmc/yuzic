import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { updateServer } from '@/utils/redux/slices/serversSlice';
import { useTheme } from '@/hooks/useTheme';
import { getMusicFolders } from '@/api/navidrome/auth/getMusicFolders';
import { getMusicLibraries } from '@/api/jellyfin/auth/getMusicLibraries';

type Library = { id: string; name: string };

const ALL_LIBRARIES_ID = '';

const LibrarySelect: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const activeServer = useSelector(selectActiveServer);
  const themeColor = useSelector(selectThemeColor);

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
        if (!cancelled) {
          setLibraries(result);
          // Auto-select the first library if nothing is stored yet
          const hasSelection = activeServer.type === 'navidrome'
            ? !!activeServer.auth?.musicFolderId
            : !!activeServer.auth?.parentId;
          if (!hasSelection && result.length > 0) {
            const authPatch = activeServer.type === 'navidrome'
              ? { musicFolderId: result[0].id }
              : { parentId: result[0].id };
            dispatch(updateServer({
              id: activeServer.id,
              patch: { auth: { ...activeServer.auth, ...authPatch } },
            }));
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeServer?.id]);

  if (!activeServer) return null;

  const rawSelection = activeServer.type === 'navidrome'
    ? activeServer.auth?.musicFolderId
    : activeServer.auth?.parentId;
  const selectedId = rawSelection != null ? String(rawSelection) : ALL_LIBRARIES_ID;

  const handleSelect = (id: string) => {
    const authPatch = activeServer.type === 'navidrome'
      ? { musicFolderId: id || undefined }
      : { parentId: id || undefined };
    dispatch(updateServer({
      id: activeServer.id,
      patch: { auth: { ...activeServer.auth, ...authPatch } },
    }));
  };

  const options: Library[] = [
    { id: ALL_LIBRARIES_ID, name: t('settings.library.librarySelect.all') },
    ...libraries,
  ];

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
        {t('settings.library.librarySelect.info')}
      </Text>

      {isLoading ? (
        <ActivityIndicator size="small" color={themeColor} style={styles.loader} />
      ) : (
        <View style={styles.optionList}>
          {options.map(option => {
            const selected = selectedId === option.id;
            return (
              <TouchableOpacity
                key={option.id === ALL_LIBRARIES_ID ? '__all__' : option.id}
                onPress={() => handleSelect(option.id)}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: selected
                      ? themeColor
                      : isDarkMode ? '#1a1a1a' : '#f1f1f1',
                    borderColor: selected
                      ? themeColor
                      : isDarkMode ? '#333' : '#ddd',
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected ? '#fff' : isDarkMode ? '#ccc' : '#333',
                    fontWeight: selected ? '600' : '400',
                    fontSize: 15,
                  }}
                  numberOfLines={1}
                >
                  {option.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default LibrarySelect;

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12,
  },
  infoTextDark: {
    color: '#aaa',
  },
  loader: {
    marginTop: 4,
  },
  optionList: {
    gap: 6,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
});
