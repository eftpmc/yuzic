import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Check } from 'lucide-react-native';
import { selectServerById } from '@/utils/redux/selectors/serversSelectors';
import { updateServer } from '@/utils/redux/slices/serversSlice';
import { getMusicFolders } from '@/api/navidrome/auth/getMusicFolders';
import { getMusicLibraries } from '@/api/jellyfin/auth/getMusicLibraries';
import { getMusicLibraries as getEmbyMusicLibraries } from '@/api/emby/auth/getMusicLibraries';
import type { RootState } from '@/utils/redux/store';

type Library = { id: string; name: string };

export default function LibrariesOnboarding() {
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
        } else if (server.type === 'jellyfin') {
          result = await getMusicLibraries(server);
        } else if (server.type === 'emby') {
          result = await getEmbyMusicLibraries(server);
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
    router.replace('/(home)/(tabs)' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Choose Libraries</Text>
        <Text style={styles.subtitle}>
          Select which libraries to include. You can pick multiple, or leave all selected to include everything.
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color="#fff" style={styles.loader} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Could not load libraries. Check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setRetryCount(c => c + 1)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.optionList}>
            <TouchableOpacity onPress={selectAll} style={styles.optionRow}>
              <View style={[styles.checkbox, isAll && styles.checkboxSelected]}>
                {isAll && <Check size={14} color="#000" />}
              </View>
              <Text style={styles.optionText}>All Libraries</Text>
            </TouchableOpacity>

            {libraries.map(lib => {
              const selected = selectedIds.includes(lib.id);
              return (
                <TouchableOpacity
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
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>
            {isAll
              ? 'Use All Libraries'
              : `Continue with ${selectedIds.length} ${selectedIds.length === 1 ? 'Library' : 'Libraries'}`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 28,
    lineHeight: 22,
  },
  loader: {
    marginTop: 40,
  },
  optionList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
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
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  errorContainer: {
    marginTop: 40,
    alignItems: 'center' as const,
    gap: 16,
  },
  errorText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  continueButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#333',
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
