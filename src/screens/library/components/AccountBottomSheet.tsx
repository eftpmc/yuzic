import React, { forwardRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Settings, RefreshCw, LogOut } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { usePlaying } from '@/contexts/PlayingContext';
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

type Props = {
  onDismiss?: () => void;
};

const AccountBottomSheet = forwardRef<BottomSheetModal, Props>(({ onDismiss }, ref) => {
  const { t } = useTranslation();
  const { colors, isDarkMode } = useTheme();
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
  const { pauseSong, resetQueue } = usePlaying();

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
          <View style={[styles.avatar, { backgroundColor: themeColor }]}>
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
        <TouchableOpacity style={styles.row} onPress={handleSettings} activeOpacity={0.7}>
          <Settings size={18} color={colors.subtext} />
          <Text style={[styles.rowText, { color: colors.secondary }]}>{t('home.account.settings')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleScan} activeOpacity={0.7}>
          <RefreshCw size={18} color={colors.subtext} />
          <Text style={[styles.rowText, { color: colors.secondary }]}>{t('home.account.triggerScan')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleSignOut} activeOpacity={0.7}>
          <LogOut size={18} color={destructiveColor} />
          <Text style={[styles.rowText, { color: destructiveColor }]}>{t('home.account.signOut')}</Text>
        </TouchableOpacity>
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
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  headerInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  serverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  serverUrl: {
    fontSize: 12,
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
