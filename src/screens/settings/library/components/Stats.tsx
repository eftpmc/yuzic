import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Loader2 } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';

import { useLibrary } from '@/contexts/LibraryContext';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { QueryKeys } from '@/enums/queryKeys';
import { useTheme } from '@/hooks/useTheme';

type QuerySummary = {
  label: string;
  fresh: number;
  stale: number;
  errored: number;
};

const Stats: React.FC = () => {
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);

  const { refreshLibrary, isLoading } = useLibrary();
  const queryClient = useQueryClient();

  const { summaries, errors } = useMemo(() => {
    const cache = queryClient.getQueryCache();

    const collect = (key: QueryKeys, label: string): QuerySummary => {
      const queries = cache.findAll({ queryKey: [key] });

      const withData = queries.filter(q => q.state.data !== undefined);
      const fresh = withData.filter(q => !q.isStale()).length;
      const stale = withData.filter(q => q.isStale()).length;
      const errored = queries.filter(q => q.state.status === 'error').length;

      return { label, fresh, stale, errored };
    };

    const errorQueries = cache
      .findAll()
      .filter(q => q.state.status === 'error')
      .map(q => ({
        key: q.queryKey.join(' / '),
        message:
          (q.state.error as Error | null)?.message ?? 'Unknown error',
      }));

    return {
      summaries: [
        collect(QueryKeys.Album, 'Albums'),
        collect(QueryKeys.Artist, 'Artists'),
        collect(QueryKeys.Playlist, 'Playlists'),
      ],
      errors: errorQueries,
    };
  }, [queryClient]);

  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading) {
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
  }, [isLoading, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleRefresh = () => {
    Alert.alert(
      'Refresh Library?',
      'This will re-fetch library data and invalidate cached entries.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          style: 'destructive',
          onPress: refreshLibrary,
        },
      ]
    );
  };

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          Library Cache
        </Text>

        <TouchableOpacity
          onPress={handleRefresh}
          disabled={isLoading}
          style={[
            styles.refreshButton,
            { backgroundColor: themeColor, opacity: isLoading ? 0.6 : 1 },
          ]}
        >
          {isLoading ? (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Loader2 size={16} color="#fff" />
            </Animated.View>
          ) : (
            <MaterialIcons name="refresh" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {summaries.map((stat, index) => (
        <View key={stat.label}>
          {index !== 0 && (
            <View style={[styles.divider, isDarkMode && styles.dividerDark]} />
          )}
          <View style={styles.row}>
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
              {stat.label}
            </Text>
            <Text style={[styles.rowValue, isDarkMode && styles.rowValueDark]}>
              {stat.errored > 0
                ? `${stat.errored} error${stat.errored > 1 ? 's' : ''}`
                : stat.stale > 0
                ? `${stat.fresh} fresh, ${stat.stale} stale`
                : stat.fresh > 0
                ? `${stat.fresh} fresh`
                : 'Cached'}
            </Text>
          </View>
        </View>
      ))}

      {errors.length > 0 && (
        <>
          <View style={[styles.divider, isDarkMode && styles.dividerDark]} />
          <Text style={[styles.errorTitle, isDarkMode && styles.errorTitleDark]}>
            Errors
          </Text>

          {errors.map((err, i) => (
            <Text
              key={`${err.key}-${i}`}
              style={[styles.errorItem, isDarkMode && styles.errorItemDark]}
            >
              • {err.key}: {err.message}
            </Text>
          ))}
        </>
      )}
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
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 4,
  },
  dividerDark: {
    backgroundColor: '#333',
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#b00020',
  },
  errorTitleDark: {
    color: '#ff6b6b',
  },
  errorItem: {
    fontSize: 12,
    color: '#b00020',
    marginTop: 4,
  },
  errorItemDark: {
    color: '#ff6b6b',
  },
});