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
  Appearance,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { Loader2 } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';

import Header from '../../components/Header';
import * as lidarr from '@/api/lidarr';

import {
  selectLidarrServerUrl,
  selectLidarrApiKey,
  selectLidarrAuthenticated,
  selectLidarrConfig,
} from '@/utils/redux/selectors/lidarrSelectors';
import {
  setServerUrl,
  setApiKey,
  setAuthenticated,
  disconnect,
} from '@/utils/redux/slices/lidarrSlice';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

const LidarrView: React.FC = () => {
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);

  const serverUrl = useSelector(selectLidarrServerUrl);
  const apiKey = useSelector(selectLidarrApiKey);
  const isAuthenticated = useSelector(selectLidarrAuthenticated);
  const config = useSelector(selectLidarrConfig);

  const { isDarkMode } = useTheme();

  const [isLoading, setIsLoading] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  const previousQueueRef = useRef<any[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

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

  const pollQueue = async () => {
    if (!isAuthenticated) return;

    try {
      const { currentQueue, finishedItems } =
        await lidarr.fetchQueueWithDiff(
          config,
          previousQueueRef.current
        );

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
    // HARD STOP when not fully connected
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

  const handlePing = async () => {
    setIsLoading(true);
    try {
      await lidarr.testConnection(config);
      dispatch(setAuthenticated(true));
      toast.success('Lidarr connection successful.');
    } catch {
      dispatch(setAuthenticated(false));
      setQueue([]);
      previousQueueRef.current = [];
      toast.error('Failed to connect.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    dispatch(disconnect());
    setQueue([]);
    previousQueueRef.current = [];
    toast('Disconnected from Lidarr.');
  };

  const toggleExpand = (id: number) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const renderDownloadItem = ({ item }) => {
    const totalSize = item.size || 1;
    const sizeLeft = item.sizeleft || 0;
    const progress = Math.min(1, (totalSize - sizeLeft) / totalSize);
    const percent = Math.round(progress * 100);

    const hasWarnings = item.statusMessages?.length > 0;
    const isExpanded = expandedItemId === item.id;
    const downloadState =
      item.trackedDownloadState || item.status || 'unknown';

    return (
      <View style={styles.itemContainer}>
        <Pressable onPress={() => hasWarnings && toggleExpand(item.id)}>
          <Text style={[styles.albumTitle, isDarkMode && styles.albumTitleDark]}>
            {item.album?.title || item.title || 'Unknown Album'}
          </Text>

          <Text style={[styles.artistName, isDarkMode && styles.artistNameDark]}>
            {item.artist?.artistName || item.artistName || 'Unknown Artist'}
          </Text>

          <Text style={[styles.status, isDarkMode && styles.statusDark]}>
            {downloadState} ({percent}%)
          </Text>

          <View style={[
            styles.progressBarBackground,
            isDarkMode && styles.progressBarBackgroundDark,
          ]}>
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: themeColor, width: `${percent}%` },
              ]}
            />
          </View>

          {hasWarnings && isExpanded && (
            <View style={[
              styles.warningContainer,
              isDarkMode && styles.warningContainerDark,
            ]}>
              {item.statusMessages.map((msg, idx) => (
                <Text
                  key={idx}
                  style={[
                    styles.warningMessage,
                    isDarkMode && styles.warningMessageDark,
                  ]}
                >
                  • {msg.title}
                </Text>
              ))}
            </View>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Header title="Lidarr" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Server URL
          </Text>
          <TextInput
            value={serverUrl}
            onChangeText={(v) => dispatch(setServerUrl(v))}
            style={[styles.input, isDarkMode && styles.inputDark]}
          />

          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            API Key
          </Text>
          <TextInput
            value={apiKey}
            onChangeText={(v) => dispatch(setApiKey(v))}
            secureTextEntry
            style={[styles.input, isDarkMode && styles.inputDark]}
          />

          <TouchableOpacity style={styles.row} onPress={handlePing}>
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
          </TouchableOpacity>
        </View>

        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Queue
          </Text>

          {loadingQueue ? (
            <Animated.View style={{ alignItems: 'center', marginTop: 20, transform: [{ rotate: spin }] }}>
              <Loader2 size={32} color={isDarkMode ? '#fff' : '#000'} />
            </Animated.View>
          ) : queue.length === 0 ? (
            <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
              Nothing downloading yet.
            </Text>
          ) : (
            <FlatList
              data={queue}
              keyExtractor={(i) => i.id.toString()}
              renderItem={renderDownloadItem}
              scrollEnabled={false}
            />
          )}
        </View>

        <TouchableOpacity
          style={[styles.disconnectButton, isDarkMode && styles.disconnectButtonDark]}
          onPress={handleDisconnect}
        >
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LidarrView;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  containerDark: { backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 6,
  },
  headerDark: {
    // No background, keep it transparent like OpenAI
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    color: '#000',
  },
  headerTitleDark: {
    color: '#fff',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { padding: 16, paddingBottom: 100 },
  section: {
    backgroundColor: '#fff',
    padding: 16, borderRadius: 10,
    marginBottom: 24
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
  emptyText: { textAlign: 'center', marginVertical: 16, fontSize: 16, color: '#666' },
  emptyTextDark: { color: '#aaa' },
  itemContainer: { padding: 16, borderRadius: 10, marginBottom: 12 },
  itemInfo: { flexDirection: 'column' },
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
  warningContainer: { marginTop: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 6 },
  warningContainerDark: { backgroundColor: '#1a1a1a' },
  warningItem: { marginBottom: 6 },
  warningTitle: { fontSize: 13, fontWeight: '600', color: '#555' },
  warningTitleDark: { color: '#ccc' },
  warningMessage: { fontSize: 12, color: '#777', marginLeft: 8, marginTop: 2 },
  warningMessageDark: { color: '#aaa' },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  disconnectButtonDark: {
    backgroundColor: '#FF453A',
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});