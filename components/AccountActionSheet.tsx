import React, { forwardRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import BottomSheet from 'react-native-gesture-bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useServer } from '@/contexts/ServerContext';

type Props = {
  themeColor: string;
  onSettings: () => void;
  onSignOut: () => void;
  onScan: () => void;
};

const AccountActionSheet = forwardRef<BottomSheet, Props>(
  ({ themeColor, onSettings, onSignOut, onScan }, ref) => {
    const isDarkMode = useColorScheme() === 'dark';
    const { username, serverUrl } = useServer();

    const initial = username?.[0]?.toUpperCase() ?? '?';

    return (
      <BottomSheet
        ref={ref}
        height={320}
        hasDraggableIcon
        sheetBackgroundColor={isDarkMode ? '#222' : '#f9f9f9'}
      >
        <View style={styles.sheetContainer}>
          {/* Header with icon */}
          <View style={styles.headerContainer}>
            <View style={[styles.iconCircle, { backgroundColor: themeColor }]}>
              <Text style={styles.iconInitial}>{initial}</Text>
            </View>
            <View>
              <Text style={[styles.username, isDarkMode && styles.usernameDark]}>
                {username}
              </Text>
              <Text style={[styles.subtext, isDarkMode && styles.subtextDark]}>
                {serverUrl}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: isDarkMode ? '#333' : '#ddd' }]} />

          {/* Options */}
          <TouchableOpacity style={styles.row} onPress={onSettings}>
            <Ionicons
              name="settings-outline"
              size={18}
              color={themeColor}
              style={styles.icon}
            />
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={onScan}>
            <Ionicons
                name="sync-outline"
                size={18}
                color={themeColor}
                style={styles.icon}
            />
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                Trigger Scan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={onSignOut}>
            <Ionicons
              name="log-out-outline"
              size={18}
              color={themeColor}
              style={styles.icon}
            />
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    );
  }
);

export default AccountActionSheet;

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
    fontWeight: 'bold',
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
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 10,
  },
  rowText: {
    fontSize: 15,
    color: '#222',
  },
  rowTextDark: {
    color: '#eee',
  }
});