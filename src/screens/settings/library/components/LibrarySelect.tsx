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
import { updateServer } from '@/utils/redux/slices/serversSlice';
import { useTheme } from '@/hooks/useTheme';
import { getMusicFolders } from '@/api/navidrome/auth/getMusicFolders';
import { getMusicLibraries } from '@/api/jellyfin/auth/getMusicLibraries';
import { Ionicons } from '@expo/vector-icons';

type Library = { id: string; name: string };

const LibrarySelect: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const activeServer = useSelector(selectActiveServer);

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
  }, [activeServer?.id]);

  if (!activeServer) return null;

  const selectedIds: string[] = (() => {
    if (activeServer.type === 'navidrome') {
      const v = activeServer.auth?.musicFolderIds;
      if (Array.isArray(v)) return v as string[];
      const old = activeServer.auth?.musicFolderId;
      return old ? [String(old)] : [];
    } else {
      const v = activeServer.auth?.parentIds;
      if (Array.isArray(v)) return v as string[];
      const old = (activeServer.auth as any)?.parentId;
      return old ? [String(old)] : [];
    }
  })();

  const isAll = selectedIds.length === 0;

  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(s => s !== id)
      : [...selectedIds, id];
    const authPatch = activeServer.type === 'navidrome'
      ? { musicFolderIds: next }
      : { parentIds: next };
    dispatch(updateServer({
      id: activeServer.id,
      patch: { auth: { ...activeServer.auth, ...authPatch } as any },
    }));
  };

  const selectAll = () => {
    const authPatch = activeServer.type === 'navidrome'
      ? { musicFolderIds: [] }
      : { parentIds: [] };
    dispatch(updateServer({
      id: activeServer.id,
      patch: { auth: { ...activeServer.auth, ...authPatch } as any },
    }));
  };

  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[styles.infoText, { color: colors.subtext }]}>
        {t('settings.library.librarySelect.info')}
      </Text>

      {isLoading ? (
        <ActivityIndicator size="small" color={colors.themeColor} style={styles.loader} />
      ) : (
        <View style={styles.optionList}>
          <TouchableOpacity
            onPress={selectAll}
            style={[styles.optionRow, {
              backgroundColor: colors.muted,
              borderColor: isAll ? colors.themeColor : colors.border,
            }]}
          >
            <View style={[styles.checkbox,
              isAll
                ? { backgroundColor: colors.themeColor, borderColor: colors.themeColor }
                : { borderColor: colors.border },
            ]}>
              {isAll && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>
              {t('settings.library.librarySelect.all')}
            </Text>
          </TouchableOpacity>

          {libraries.map(lib => {
            const selected = selectedIds.includes(lib.id);
            return (
              <TouchableOpacity
                key={lib.id}
                onPress={() => toggle(lib.id)}
                style={[styles.optionRow, {
                  backgroundColor: colors.muted,
                  borderColor: selected ? colors.themeColor : colors.border,
                }]}
              >
                <View style={[styles.checkbox,
                  selected
                    ? { backgroundColor: colors.themeColor, borderColor: colors.themeColor }
                    : { borderColor: colors.border },
                ]}>
                  {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={1}>
                  {lib.name}
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
    borderRadius: 12,
  },
  infoText: {
    fontSize: 13,
    marginBottom: 12,
  },
  loader: {
    marginTop: 4,
  },
  optionList: {
    gap: 6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 15,
    flex: 1,
  },
});
