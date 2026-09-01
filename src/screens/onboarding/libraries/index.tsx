import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { selectServerById } from '@/utils/redux/selectors/serversSelectors';
import { updateServer } from '@/utils/redux/slices/serversSlice';
import { getMusicFolders } from '@/api/navidrome/auth/getMusicFolders';
import { getMusicLibraries } from '@/api/mediaBrowser/auth/getMusicLibraries';
import type { RootState } from '@/utils/redux/store';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { radius, spacing, typography } from '@/constants/design';

type Library = { id: string; name: string };

export default function LibrariesOnboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch();
  const { serverId } = useLocalSearchParams<{ serverId: string }>();

  const server = useSelector((state: RootState) =>
    selectServerById(serverId)(state)
  );

  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!server) return;

    let cancelled = false;
    setIsLoading(true);
    setError(false);

    const load = async () => {
      try {
        let result: Library[] = [];
        if (server.type === 'navidrome') {
          result = await getMusicFolders(server);
        } else if (server.type === 'jellyfin' || server.type === 'emby') {
          result = await getMusicLibraries(server);
        }
        if (!cancelled) setLibraries(result);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [server, retryCount]);

  const toggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds([]);

  const isAll = selectedIds.length === 0;

  const handleContinue = () => {
    if (!server) return;
    const authPatch = server.type === 'navidrome'
      ? { musicFolderIds: selectedIds }
      : { parentIds: selectedIds };
    dispatch(updateServer({
      id: server.id,
      patch: { auth: { ...server.auth, ...authPatch } as any },
    }));
    router.replace('/(home)/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('onboarding.libraries.title')}</Text>
        <Text style={styles.subtitle}>
          {t('onboarding.libraries.subtitle')}
        </Text>

        {isLoading ? (
          <SpinningLoaderCircle size={26} color="#fff" />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{t('onboarding.libraries.loadError')}</Text>
            <Touchable style={styles.retryButton} onPress={() => setRetryCount(c => c + 1)}>
              <Text style={styles.retryButtonText}>{t('onboarding.libraries.retry')}</Text>
            </Touchable>
          </View>
        ) : (
          <View style={styles.optionList}>
            <Touchable onPress={selectAll} style={styles.optionRow}>
              <View style={[styles.checkbox, isAll && styles.checkboxSelected]}>
                {isAll && <Check size={14} color="#000" />}
              </View>
              <Text style={styles.optionText}>{t('onboarding.libraries.allLibraries')}</Text>
            </Touchable>

            {libraries.map(lib => {
              const selected = selectedIds.includes(lib.id);
              return (
                <Touchable
                  key={lib.id}
                  onPress={() => toggle(lib.id)}
                  style={styles.optionRow}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected && <Check size={14} color="#000" />}
                  </View>
                  <Text style={styles.optionText} numberOfLines={1}>
                    {lib.name}
                  </Text>
                </Touchable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Touchable style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>
            {isAll
              ? t('onboarding.libraries.useAll')
              : t('onboarding.libraries.continueWith', { count: selectedIds.length })}
          </Text>
        </Touchable>

        <Touchable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </Touchable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.roomy,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.roomy,
  },
  title: {
    ...typography.display,
    color: '#fff',
    marginBottom: spacing.controlGap,
  },
  subtitle: {
    ...typography.body,
    color: '#888',
    marginBottom: spacing.xxl,
  },
  loader: {
    marginTop: spacing.xxxl,
  },
  optionList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  optionText: {
    ...typography.body,
    color: '#fff',
    flex: 1,
  },
  buttonContainer: {
    padding: spacing.roomy,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  errorContainer: {
    marginTop: spacing.xxxl,
    alignItems: 'center' as const,
    gap: 16,
  },
  errorText: {
    ...typography.body,
    color: '#888',
    textAlign: 'center' as const,
  },
  retryButton: {
    backgroundColor: '#333',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
  },
  retryButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600' as const,
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  continueButtonText: {
    ...typography.sheetTitle,
    color: '#000',
  },
  backButton: {
    backgroundColor: '#333',
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.xs,
  },
  backButtonText: {
    ...typography.sheetTitle,
    color: '#fff',
  },
});
