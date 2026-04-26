import React, { forwardRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
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

const AccountBottomSheet = forwardRef<BottomSheetModal, Props>(
  ({ onDismiss }, ref) => {

    const { t } = useTranslation();
    const { isDarkMode } = useTheme();
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
        queryClient.clear();
        dispatch(disconnect());
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
        backgroundStyle={{
          backgroundColor: isDarkMode ? '#222' : '#f9f9f9',
        }}
        handleIndicatorStyle={{
          backgroundColor: isDarkMode ? '#555' : '#ccc',
        }}
      >
        <BottomSheetView style={styles.sheetContainer}>
          <View style={styles.headerContainer}>
            <View style={[styles.iconCircle, { backgroundColor: themeColor }]}>
              <Text style={styles.iconInitial}>{initial}</Text>
            </View>
            <View>
              <Text style={[styles.username, isDarkMode && styles.usernameDark]}>
                {username}
              </Text>
              <Text style={[styles.subtext, isDarkMode && styles.subtextDark]}>
                {serverUrl?.replace(/^https?:\/\//, '')}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: isDarkMode ? '#333' : '#ddd' },
            ]}
          />

          <TouchableOpacity style={styles.row} onPress={handleSettings}>
            <Ionicons name="settings-outline" size={18} color={themeColor} />
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
              {t('home.account.settings')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleScan}>
            <Ionicons name="sync-outline" size={18} color={themeColor} />
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
              {t('home.account.triggerScan')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={themeColor} />
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
              {t('home.account.signOut')}
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    );
  });

AccountBottomSheet.displayName = 'AccountBottomSheet';

export default AccountBottomSheet;

const styles = StyleSheet.create({
  sheetContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInitial: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  usernameDark: {
    color: '#fff',
  },
  subtext: {
    fontSize: 13,
    color: '#666',
  },
  subtextDark: {
    color: '#aaa',
  },
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
  rowText: {
    fontSize: 15,
    color: '#222',
  },
  rowTextDark: {
    color: '#eee',
  },
});