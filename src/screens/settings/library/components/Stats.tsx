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
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Loader2 } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
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
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);

  const queryClient = useQueryClient();

  const isLoading = queryClient.isFetching() > 0;

  const refreshLibrary = () => {
    queryClient.invalidateQueries({ queryKey: [QueryKeys.Albums], exact: false });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.Artists], exact: false });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlists], exact: false });
  };

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
          (q.state.error as Error | null)?.message ?? t('settings.library.stats.unknownError'),
      }));

    return {
      summaries: [
        collect(QueryKeys.Albums, t('settings.library.stats.summary.albums')),
        collect(QueryKeys.Artists, t('settings.library.stats.summary.artists')),
        collect(QueryKeys.Playlists, t('settings.library.stats.summary.playlists')),
      ],
      errors: errorQueries,
    };
  }, [queryClient, t]);

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
      t('settings.library.stats.refreshTitle'),
      t('settings.library.stats.refreshBody'),
      [
        { text: t('settings.library.stats.refreshCancel'), style: 'cancel' },
        {
          text: t('settings.library.stats.refreshConfirm'),
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
          {t('settings.library.stats.title')}
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
                ? t('settings.library.stats.status.errors', { count: stat.errored })
                : stat.stale > 0
                  ? t('settings.library.stats.status.freshStale', { fresh: stat.fresh, stale: stat.stale })
                  : stat.fresh > 0
                    ? t('settings.library.stats.status.fresh', { count: stat.fresh })
                    : t('settings.library.stats.status.cached')}
            </Text>
          </View>
        </View>
      ))}

      {errors.length > 0 && (
        <>
          <View style={[styles.divider, isDarkMode && styles.dividerDark]} />
          <Text style={[styles.errorTitle, isDarkMode && styles.errorTitleDark]}>
            {t('settings.library.stats.errorsTitle')}
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