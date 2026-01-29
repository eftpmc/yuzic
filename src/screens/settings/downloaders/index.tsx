import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';

import Header from '../components/Header';
import { useTheme } from '@/hooks/useTheme';
import {
  selectLidarrAuthenticated,
  selectSlskdAuthenticated,
  selectActiveDownloader,
} from '@/utils/redux/selectors/downloadersSelectors';
import { setActiveDownloader } from '@/utils/redux/slices/downloadersSlice';
import type { DownloaderType } from '@/utils/redux/slices/downloadersSlice';

const LIDARR_ICON = require('@assets/images/lidarr.png');
const SLSKD_ICON = require('@assets/images/slskd.png');

const DOWNLOADERS: {
  id: DownloaderType;
  label: string;
  icon: number;
  route: string;
}[] = [
  { id: 'lidarr', label: 'Lidarr', icon: LIDARR_ICON, route: '/settings/lidarrView' },
  { id: 'slskd', label: 'slskd', icon: SLSKD_ICON, route: '/settings/slskdView' },
];

const DownloadersView: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const activeDownloader = useSelector(selectActiveDownloader);
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);

  const getConnectionStatus = (id: DownloaderType) => {
    if (id === 'lidarr') return isLidarrConnected;
    if (id === 'slskd') return isSlskdConnected;
    return false;
  };

  const handleSelect = (id: DownloaderType, route: string) => {
    dispatch(setActiveDownloader(id));
    router.push(route as any);
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Header title="Downloaders" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {DOWNLOADERS.map((d) => {
          const isActive = activeDownloader === d.id;
          const isConnected = getConnectionStatus(d.id);

          return (
            <TouchableOpacity
              key={d.id}
              style={[
                styles.row,
                isDarkMode && styles.rowDark,
                isActive && styles.rowSelected,
                isActive && isDarkMode && styles.rowSelectedDark,
              ]}
              onPress={() => handleSelect(d.id, d.route)}
              activeOpacity={0.7}
            >
              <Image
                source={d.icon}
                style={styles.downloaderIcon}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
              <View style={styles.rowContent}>
                <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                  {d.label}
                </Text>
                <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
                  {isConnected ? 'Connected' : 'Not connected'}
                </Text>
              </View>
              {isActive ? (
                <MaterialIcons
                  name="check-circle"
                  size={24}
                  color="#34C759"
                  style={styles.checkIcon}
                />
              ) : null}
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={isDarkMode ? '#fff' : '#6E6E73'}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DownloadersView;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  containerDark: { backgroundColor: '#000' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  rowDark: { backgroundColor: '#111' },
  rowSelected: {
    borderWidth: 2,
    borderColor: '#34C759',
  },
  rowSelectedDark: {
    borderColor: '#34C759',
  },
  downloaderIcon: { width: 40, height: 40, marginRight: 14 },
  rowContent: { flex: 1 },
  rowText: { fontSize: 17, fontWeight: '600', color: '#000', marginBottom: 2 },
  rowTextDark: { color: '#fff' },
  subtitle: { fontSize: 13, color: '#6E6E73' },
  subtitleDark: { color: '#8E8E93' },
  checkIcon: { marginRight: 8 },
});
