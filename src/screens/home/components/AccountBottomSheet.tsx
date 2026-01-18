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
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { useRouter } from 'expo-router';
import { useApi } from '@/api';
import { disconnect } from '@/utils/redux/slices/serversSlice';
import { toast } from '@backpackapp-io/react-native-toast';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  onDismiss?: () => void;
};

const AccountBottomSheet = forwardRef<BottomSheetModal, Props>(
  ({ onDismiss }, ref) => {

    const { isDarkMode } = useTheme();
    const router = useRouter();
    const dispatch = useDispatch();
    const api = useApi();

    const snapPoints = useMemo(() => ['40%'], []);

    const activeServer = useSelector(selectActiveServer);
    const username = activeServer?.username;
    const serverUrl = activeServer?.serverUrl;
    const themeColor = useSelector(selectThemeColor);

    const { clearLibrary } = useLibrary();
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
        toast.success(result?.message ?? 'Scan triggered.');
      } catch {
        toast.error('Could not trigger scan.');
      }
    };

    const handleSignOut = async () => {
      close();
      try {
        await pauseSong();
        await resetQueue();
        clearLibrary();
        dispatch(disconnect());
        router.replace('/(onboarding)');
      } catch {
        toast.error('Could not sign out cleanly.');
      }
    };

    return (
      <BottomSheetModal
        ref={ref}
        onDismiss={onDismiss}
        snapPoints={snapPoints}
        backgroundStyle={{
          backgroundColor: isDarkMode ? '#222' : '#f9f9f9',
        }}
        handleIndicatorStyle={{
          backgroundColor: isDarkMode ? '#555' : '#ccc',
        }}
        enableDynamicSizing={false}
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
              Settings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleScan}>
            <Ionicons name="sync-outline" size={18} color={themeColor} />
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
              Trigger Scan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={themeColor} />
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    );
  });

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