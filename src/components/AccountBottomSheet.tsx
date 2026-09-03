import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Settings, RefreshCw, LogOut } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { useRouter } from 'expo-router';
import { useApi } from '@/api';
import { disconnect } from '@/utils/redux/slices/serversSlice';
import { toast } from '@backpackapp-io/react-native-toast';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import Touchable from '@/components/Touchable';
import { radius, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

type Props = {
  onDismiss?: () => void;
};

const AccountBottomSheet = forwardRef<BottomSheetModal, Props>(({ onDismiss }, ref) => {
  const { t } = useTranslation();
  const { colors, isDarkMode } = useTheme();
  const rad = useRadius();
  const router = useRouter();
  const dispatch = useDispatch();
  const api = useApi();

  const snapPoints = useMemo(() => ['40%'], []);

  const activeServer = useSelector(selectActiveServer);
  const username = activeServer?.username;
  const serverUrl = activeServer?.serverUrl;
  const type = activeServer?.type;
  const themeColor = useSelector(selectThemeColor);

  const queryClient = useQueryClient();
  const { pauseSong, resetQueue } = usePlayingActions();

  const initial = username?.[0]?.toUpperCase() ?? '?';
  const cleanUrl = serverUrl?.replace(/^https?:\/\//, '');
  const close = () => (ref as any)?.current?.dismiss();

  const handleSettings = () => {
    close();
    router.push('/settings');
  };

  const handleScan = async () => {
    close();
    try {
      const result = await api.auth.startScan();
      toast.success(result?.message ?? t('home.account.scanTriggered'));
    } catch {
      toast.error(t('home.account.scanFailed'));
    }
  };

  const handleSignOut = async () => {
    close();
    try {
      await pauseSong();
      await resetQueue();
      dispatch(disconnect());
      await queryClient.cancelQueries();
      queryClient.clear();
      router.replace('/(onboarding)');
    } catch {
      toast.error(t('home.account.signOutFailed'));
    }
  };

  const destructiveColor = isDarkMode ? '#FF453A' : '#FF3B30';

  return (
    <BottomSheetModal
      ref={ref}
      onDismiss={onDismiss}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={[{ backgroundColor: colors.card }, styles.sheetBackground]}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={styles.container}>
        {/* Profile */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: themeColor, borderRadius: rad.pill }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.username, { color: colors.secondary }]}>{username}</Text>
            <View style={styles.serverMeta}>
              {type && (
                <View style={[styles.typeBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.typeBadgeText, { color: colors.subtext }]}>{type}</Text>
                </View>
              )}
              <Text style={[styles.serverUrl, { color: colors.subtext }]} numberOfLines={1}>
                {cleanUrl}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Actions */}
        <Touchable style={styles.row} onPress={handleSettings}>
          <Settings size={18} color={colors.subtext} />
          <Text style={[styles.rowText, { color: colors.secondary }]}>{t('home.account.settings')}</Text>
        </Touchable>

        <Touchable style={styles.row} onPress={handleScan}>
          <RefreshCw size={18} color={colors.subtext} />
          <Text style={[styles.rowText, { color: colors.secondary }]}>{t('home.account.triggerScan')}</Text>
        </Touchable>

        <Touchable style={styles.row} onPress={handleSignOut}>
          <LogOut size={18} color={destructiveColor} />
          <Text style={[styles.rowText, { color: destructiveColor }]}>{t('home.account.signOut')}</Text>
        </Touchable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

AccountBottomSheet.displayName = 'AccountBottomSheet';

export default AccountBottomSheet;

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.navigationTitle,
    fontWeight: '700',
    color: '#fff',
  },
  headerInfo: {
    flex: 1,
  },
  username: {
    ...typography.sheetTitle,
    marginBottom: spacing.xs,
  },
  serverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: spacing.tight,
    paddingVertical: spacing.xxs,
    borderRadius: radius.xs,
  },
  typeBadgeText: {
    ...typography.micro,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  serverUrl: {
    ...typography.caption,
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  rowText: {
    ...typography.compactRowTitle,
  },
});
