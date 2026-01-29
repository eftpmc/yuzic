import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';

import Header from '../components/Header';
import { useTheme } from '@/hooks/useTheme';
import { selectLidarrAuthenticated } from '@/utils/redux/selectors/downloadersSelectors';

const LIDARR_ICON = require('@assets/images/lidarr.png');

const DownloadersView: React.FC = () => {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const isConnected = useSelector(selectLidarrAuthenticated);

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Header title="Downloaders" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={[styles.row, isDarkMode && styles.rowDark]}
          onPress={() => router.push('/settings/lidarrView')}
          activeOpacity={0.7}
        >
          <Image
            source={LIDARR_ICON}
            style={styles.lidarrIcon}
            resizeMode="contain"
          />
          <View style={styles.rowContent}>
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
              Lidarr
            </Text>
            <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
              {isConnected ? 'Connected' : 'Not connected'}
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={isDarkMode ? '#fff' : '#6E6E73'}
          />
        </TouchableOpacity>
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
  lidarrIcon: { width: 40, height: 40, marginRight: 14 },
  rowContent: { flex: 1 },
  rowText: { fontSize: 17, fontWeight: '600', color: '#000', marginBottom: 2 },
  rowTextDark: { color: '#fff' },
  subtitle: { fontSize: 13, color: '#6E6E73' },
  subtitleDark: { color: '#8E8E93' },
});
