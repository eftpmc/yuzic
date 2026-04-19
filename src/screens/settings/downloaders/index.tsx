import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';

import Header from '../components/Header';
import { useTheme } from '@/hooks/useTheme';
import {
  selectLidarrAuthenticated,
  selectSlskdAuthenticated,
} from '@/utils/redux/selectors/downloadersSelectors';

const LIDARR_ICON = require('@assets/images/lidarr.png');
const SLSKD_ICON = require('@assets/images/slskd.png');

const DOWNLOADERS: {
  id: 'lidarr' | 'slskd';
  labelKey: string;
  icon: number;
  route: string;
}[] = [
  { id: 'lidarr', labelKey: 'settings.downloaders.lidarr.title', icon: LIDARR_ICON, route: '/settings/lidarrView' },
  { id: 'slskd', labelKey: 'settings.downloaders.slskd.title', icon: SLSKD_ICON, route: '/settings/slskdView' },
];

const DownloadersView: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);

  const getConnectionStatus = (id: 'lidarr' | 'slskd') => {
    if (id === 'lidarr') return isLidarrConnected;
    if (id === 'slskd') return isSlskdConnected;
    return false;
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Header title={t('settings.downloaders.title')} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {DOWNLOADERS.map((d) => {
          const isConnected = getConnectionStatus(d.id);

          return (
            <TouchableOpacity
              key={d.id}
              style={[styles.row, isDarkMode && styles.rowDark]}
              onPress={() => router.push(d.route as any)}
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
                  {t(d.labelKey)}
                </Text>
                <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
                  {isConnected ? t('settings.downloaders.connected') : t('settings.downloaders.notConnected')}
                </Text>
              </View>
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
  downloaderIcon: { width: 40, height: 40, marginRight: 14 },
  rowContent: { flex: 1 },
  rowText: { fontSize: 17, fontWeight: '600', color: '#000', marginBottom: 2 },
  rowTextDark: { color: '#fff' },
  subtitle: { fontSize: 13, color: '#6E6E73' },
  subtitleDark: { color: '#8E8E93' },
});
