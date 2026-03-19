import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useTranslation, TFunction } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Loader2 } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useSync } from '@/hooks/useSync';

function formatLastSynced(ts: number | null, t: TFunction): string {
  if (ts === null) return t('settings.library.stats.neverSynced')
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return t('settings.library.stats.justNow')
  if (mins < 60) return t('settings.library.stats.minsAgo', { count: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t('settings.library.stats.hoursAgo', { count: hrs })
  return t('settings.library.stats.daysAgo', { count: Math.floor(hrs / 24) })
}

const Stats: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const { sync, isSyncing, lastSyncedAt } = useSync();

  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isSyncing) {
      spinValue.stopAnimation();
      spinValue.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    loop.start();
    return () => loop.stop();
  }, [isSyncing, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          {t('settings.library.stats.title')}
        </Text>

        <TouchableOpacity
          onPress={sync}
          disabled={isSyncing}
          style={[
            styles.refreshButton,
            { backgroundColor: themeColor, opacity: isSyncing ? 0.6 : 1 },
          ]}
        >
          {isSyncing ? (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Loader2 size={16} color="#fff" />
            </Animated.View>
          ) : (
            <MaterialIcons name="refresh" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
          {t('settings.library.stats.lastSynced')}
        </Text>
        <Text style={[styles.rowValue, isDarkMode && styles.rowValueDark]}>
          {formatLastSynced(lastSyncedAt, t)}
        </Text>
      </View>
    </View>
  );
};

export default Stats;

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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sectionTitleDark: {
    color: '#fff',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowText: {
    fontSize: 16,
    color: '#000',
  },
  rowTextDark: {
    color: '#fff',
  },
  rowValue: {
    fontSize: 14,
    color: '#666',
  },
  rowValueDark: {
    color: '#aaa',
  },
});
