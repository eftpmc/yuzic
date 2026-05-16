import React, { forwardRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
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
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const api = useApi();

  const snapPoints = useMemo(() => ['40%'], []);

  const activeServer = useSelector(selectActiveServer);
  const username = activeServer?.username;
  const serverUrl = activeServer?.serverUrl;
  const themeColor = useSelector(selectThemeColor);

  const queryClient = useQueryClient();
  const { pauseSong, resetQueue } = usePlaying();

  const initial = username?.[0]?.toUpperCase() ?? '?';
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

  return (
    <BottomSheetModal
      ref={ref}
      onDismiss={onDismiss}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: themeColor }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View>
            <Text style={[styles.username, { color: colors.text }]}>{username}</Text>
            <Text style={[styles.subtext, { color: colors.subtext }]}>
              {serverUrl?.replace(/^https?:\/\//, '')}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.row} onPress={handleSettings}>
          <Ionicons name="settings-outline" size={18} color={themeColor} />
          <Text style={[styles.rowText, { color: colors.text }]}>{t('home.account.settings')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleScan}>
          <Ionicons name="sync-outline" size={18} color={themeColor} />
          <Text style={[styles.rowText, { color: colors.text }]}>{t('home.account.triggerScan')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color={themeColor} />
          <Text style={[styles.rowText, { color: colors.text }]}>{t('home.account.signOut')}</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

AccountBottomSheet.displayName = 'AccountBottomSheet';

export default AccountBottomSheet;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtext: { fontSize: 13 },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  rowText: { fontSize: 15 },
});
