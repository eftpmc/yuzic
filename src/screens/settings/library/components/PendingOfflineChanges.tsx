import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
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
import Touchable from '@/components/Touchable';
import { spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

export default function PendingOfflineChanges() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isDarkMode, colors } = useTheme();
  const rad = useRadius();
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
      <View style={[styles.iconWrap, { backgroundColor: `${colors.themeColor}22`, borderRadius: rad.pill }]}>
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
            <Touchable
              onPress={retryFailed}
              style={[
                styles.actionButton,
                { backgroundColor: `${colors.themeColor}18`, borderColor: `${colors.themeColor}44`, borderRadius: rad.md },
              ]}
            >
              <RotateCcw size={14} color={colors.themeColor} />
              <Text style={[styles.actionText, { color: colors.themeColor }]}>
                {t('settings.library.offlineChanges.retry')}
              </Text>
            </Touchable>
          )}
          <Touchable
            onPress={discardPending}
            style={[styles.actionButton, discardBtnStyle, { borderRadius: rad.md }]}
          >
            <Trash2 size={14} color={discardIconColor} />
            <Text style={[styles.actionText, { color: discardTextColor }]}>
              {t('settings.library.offlineChanges.discard')}
            </Text>
          </Touchable>
        </View>
      </View>
      <View style={[styles.badge, { backgroundColor: colors.themeColor, borderRadius: rad.pill }]}>
        <Text style={styles.badgeText}>{pendingCount}</Text>
      </View>
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textWrap: { flex: 1 },
  title: {
    ...typography.button,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.controlGap,
  },
  actionButton: {
    minHeight: 30,
    borderWidth: 1,
    paddingHorizontal: spacing.controlGap,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    ...typography.caption,
    fontWeight: '600',
  },
  badge: {
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.controlGap,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#fff',
  },
});
