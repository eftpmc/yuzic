import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CloudUpload, RotateCcw, Trash2 } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/hooks/useTheme';
import { selectOfflineMutationQueue } from '@/utils/redux/selectors/offlineMutationsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import {
  clearOfflineMutationsForServer,
  retryOfflineMutationsForServer,
} from '@/utils/redux/slices/offlineMutationsSlice';
import SettingsCard from '../../components/SettingsCard';

export default function PendingOfflineChanges() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isDarkMode, colors } = useTheme();
  const activeServer = useSelector(selectActiveServer);
  const activeServerId = activeServer?.id;
  const queue = useSelector(selectOfflineMutationQueue);
  const serverQueue = activeServerId
    ? queue.filter(item => item.serverId === activeServerId)
    : queue;
  const pendingCount = serverQueue.length;
  const failedCount = serverQueue.filter(item => item.lastError).length;

  if (pendingCount === 0) return null;

  const retryFailed = () => {
    if (!activeServerId) return;
    dispatch(retryOfflineMutationsForServer(activeServerId));
  };

  const discardPending = () => {
    if (!activeServerId) return;
    Alert.alert(
      t('settings.library.offlineChanges.discardTitle'),
      t('settings.library.offlineChanges.discardBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.library.offlineChanges.discard'),
          style: 'destructive',
          onPress: () => dispatch(clearOfflineMutationsForServer(activeServerId)),
        },
      ]
    );
  };

  const discardIconColor = isDarkMode ? '#ffb4ad' : '#c7342f';
  const discardBtnStyle = isDarkMode
    ? { borderColor: '#54302d', backgroundColor: '#2a1716' }
    : { borderColor: '#ead4d2', backgroundColor: '#fff1f0' };
  const discardTextColor = isDarkMode ? '#ffb4ad' : '#c7342f';

  return (
    <SettingsCard style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.themeColor}22` }]}>
        <CloudUpload size={21} color={colors.themeColor} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.secondary }]}>
          {t('settings.library.offlineChanges.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          {t(
            failedCount > 0
              ? 'settings.library.offlineChanges.failedSubtitle'
              : 'settings.library.offlineChanges.subtitle',
            { count: failedCount || pendingCount }
          )}
        </Text>
        <View style={styles.actions}>
          {failedCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={retryFailed}
              style={[
                styles.actionButton,
                { backgroundColor: `${colors.themeColor}18`, borderColor: `${colors.themeColor}44` },
              ]}
            >
              <RotateCcw size={14} color={colors.themeColor} />
              <Text style={[styles.actionText, { color: colors.themeColor }]}>
                {t('settings.library.offlineChanges.retry')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={discardPending}
            style={[styles.actionButton, discardBtnStyle]}
          >
            <Trash2 size={14} color={discardIconColor} />
            <Text style={[styles.actionText, { color: discardTextColor }]}>
              {t('settings.library.offlineChanges.discard')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.badge, { backgroundColor: colors.themeColor }]}>
        <Text style={styles.badgeText}>{pendingCount}</Text>
      </View>
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    minHeight: 30,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginLeft: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
