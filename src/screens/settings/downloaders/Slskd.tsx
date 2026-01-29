import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { Loader2 } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';

import Header from '../components/Header';
import * as slskd from '@/api/slskd';
import type { SlskdQueueRecord } from '@/api/slskd';

import {
  selectSlskdServerUrl,
  selectSlskdApiKey,
  selectSlskdAuthenticated,
  selectSlskdConfig,
} from '@/utils/redux/selectors/downloadersSelectors';
import {
  setSlskdServerUrl,
  setSlskdApiKey,
  setSlskdAuthenticated,
  connectSlskd,
  disconnectSlskd,
} from '@/utils/redux/slices/downloadersSlice';

import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

const SlskdView: React.FC = () => {
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const { isDarkMode } = useTheme();

  const serverUrl = useSelector(selectSlskdServerUrl);
  const apiKey = useSelector(selectSlskdApiKey);
  const isAuthenticated = useSelector(selectSlskdAuthenticated);
  const config = useSelector(selectSlskdConfig);

  const [isLoading, setIsLoading] = useState(false);
  const [queue, setQueue] = useState<SlskdQueueRecord[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  const previousQueueRef = useRef<SlskdQueueRecord[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    if (!serverUrl || !apiKey) {
      dispatch(setSlskdAuthenticated(false));
      return;
    }

    if (isAuthenticated) return;

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsLoading(true);

      try {
        if (config.serverUrl && config.apiKey) {
          await slskd.testConnection(config);

          if (!cancelled) {
            dispatch(connectSlskd());
          }
        }
      } catch {
        if (!cancelled) {
          dispatch(setSlskdAuthenticated(false));
          toast.error('slskd connection failed');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [serverUrl, apiKey]);

  useEffect(() => {
    if (!isAuthenticated) {
      setQueue([]);
      previousQueueRef.current = [];
    }
  }, [isAuthenticated]);

  const pollQueue = async () => {
    if (!isAuthenticated) return;

    try {
      const { currentQueue, finishedItems } =
        await slskd.fetchQueueWithDiff(config, previousQueueRef.current);

      previousQueueRef.current = currentQueue;
      setQueue(currentQueue);

      if (finishedItems.length > 0) {
        toast('Download complete!');
      }
    } catch {
      console.warn('Queue polling failed');
    }
  };

  useEffect(() => {
    if (!config.serverUrl || !config.apiKey || !isAuthenticated) {
      setQueue([]);
      previousQueueRef.current = [];
      setLoadingQueue(false);

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    setLoadingQueue(true);
    pollQueue().finally(() => setLoadingQueue(false));

    pollingRef.current = setInterval(pollQueue, 10000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [config.serverUrl, config.apiKey, isAuthenticated]);

  const handleDisconnect = () => {
    dispatch(disconnectSlskd());
    setQueue([]);
    previousQueueRef.current = [];
    toast('Disconnected from slskd.');
  };

  const renderDownloadItem = ({ item }: { item: SlskdQueueRecord }) => {
    const percent = Math.round(item.percentComplete ?? 0);
    const title = item.title ?? item.filename ?? 'Unknown file';
    const subtitle = item.artistName ?? item.username ?? '';

    return (
      <View style={styles.itemContainer}>
        <Text style={[styles.albumTitle, isDarkMode && styles.albumTitleDark]}>
          {title}
        </Text>

        <Text style={[styles.artistName, isDarkMode && styles.artistNameDark]}>
          {subtitle}
        </Text>

        <Text style={[styles.status, isDarkMode && styles.statusDark]}>
          {item.state} ({percent}%)
        </Text>

        <View
          style={[
            styles.progressBarBackground,
            isDarkMode && styles.progressBarBackgroundDark,
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              { backgroundColor: themeColor, width: `${Math.min(100, percent)}%` },
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Header title="slskd" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Server URL
          </Text>
          <TextInput
            value={serverUrl}
            onChangeText={(v) => dispatch(setSlskdServerUrl(v))}
            placeholder="http://slskd:5030"
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            style={[styles.input, isDarkMode && styles.inputDark]}
          />

          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            API Key
          </Text>
          <TextInput
            value={apiKey}
            onChangeText={(v) => dispatch(setSlskdApiKey(v))}
            placeholder="API key"
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            secureTextEntry
            style={[styles.input, isDarkMode && styles.inputDark]}
          />

          <View style={styles.row}>
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
              Connectivity
            </Text>

            {isLoading ? (
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Loader2 size={20} color={themeColor} />
              </Animated.View>
            ) : (
              <MaterialIcons
                name={isAuthenticated ? 'check-circle' : 'cancel'}
                size={20}
                color={isAuthenticated ? 'green' : 'red'}
              />
            )}
          </View>
        </View>

        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Queue
          </Text>

          {loadingQueue ? (
            <Animated.View
              style={{
                alignItems: 'center',
                marginTop: 20,
                transform: [{ rotate: spin }],
              }}
            >
              <Loader2 size={32} color={isDarkMode ? '#fff' : '#000'} />
            </Animated.View>
          ) : queue.length === 0 ? (
            <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
              Nothing downloading yet.
            </Text>
          ) : (
            <FlatList
              data={queue}
              keyExtractor={(i) => i.id}
              renderItem={renderDownloadItem}
              scrollEnabled={false}
            />
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.disconnectButton,
            isDarkMode && styles.disconnectButtonDark,
          ]}
          onPress={handleDisconnect}
        >
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SlskdView;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  containerDark: { backgroundColor: '#000' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
  },
  sectionDark: { backgroundColor: '#111' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#000' },
  labelDark: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  inputDark: {
    borderColor: '#444',
    backgroundColor: '#1a1a1a',
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  rowText: { fontSize: 16, color: '#000' },
  rowTextDark: { color: '#fff' },
  emptyText: {
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyTextDark: { color: '#aaa' },
  itemContainer: { padding: 16, borderRadius: 10, marginBottom: 12 },
  albumTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  albumTitleDark: { color: '#fff' },
  artistName: { fontSize: 14, color: '#666', marginTop: 4 },
  artistNameDark: { color: '#aaa' },
  status: { fontSize: 12, color: '#888', marginTop: 6 },
  statusDark: { color: '#888' },
  progressBarBackground: {
    height: 6,
    width: '100%',
    backgroundColor: '#ddd',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarBackgroundDark: { backgroundColor: '#333' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  disconnectButtonDark: { backgroundColor: '#FF453A' },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
