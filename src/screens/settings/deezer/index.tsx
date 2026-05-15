import React from 'react';
import { ScrollView, View, Text, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import { useTheme } from '@/hooks/useTheme';
import {
  selectThemeColor,
  selectDeezerDiscoveryEnabled,
  selectDeezerSearchEnabled,
  selectDeezerExternalScreensEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setDeezerDiscoveryEnabled,
  setDeezerSearchEnabled,
  setDeezerExternalScreensEnabled,
} from '@/utils/redux/slices/settingsSlice';

export default function DeezerSettings() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const discoveryEnabled = useSelector(selectDeezerDiscoveryEnabled);
  const searchEnabled = useSelector(selectDeezerSearchEnabled);
  const externalScreensEnabled = useSelector(selectDeezerExternalScreensEnabled);

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Header title="Deezer" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                {t('settings.deezer.discovery')}
              </Text>
              <Text style={[styles.rowSubtext, isDarkMode && styles.rowSubtextDark]}>
                {t('settings.deezer.discoveryDescription')}
              </Text>
            </View>
            <Switch
              value={discoveryEnabled}
              onValueChange={v => { dispatch(setDeezerDiscoveryEnabled(v)) }}
              trackColor={{ true: themeColor }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                {t('settings.deezer.search')}
              </Text>
              <Text style={[styles.rowSubtext, isDarkMode && styles.rowSubtextDark]}>
                {t('settings.deezer.searchDescription')}
              </Text>
            </View>
            <Switch
              value={searchEnabled}
              onValueChange={v => { dispatch(setDeezerSearchEnabled(v)) }}
              trackColor={{ true: themeColor }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                {t('settings.deezer.externalScreens')}
              </Text>
              <Text style={[styles.rowSubtext, isDarkMode && styles.rowSubtextDark]}>
                {t('settings.deezer.externalScreensDescription')}
              </Text>
            </View>
            <Switch
              value={externalScreensEnabled}
              onValueChange={v => { dispatch(setDeezerExternalScreensEnabled(v)) }}
              trackColor={{ true: themeColor }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 120,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
  },
  rowLeft: {
    flex: 1,
  },
  rowText: {
    fontSize: 16,
    color: '#000',
  },
  rowTextDark: {
    color: '#fff',
  },
  rowSubtext: {
    fontSize: 13,
    color: '#6E6E73',
    marginTop: 2,
  },
  rowSubtextDark: {
    color: '#aaa',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '92%',
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
  },
  dividerDark: {
    backgroundColor: '#333',
  },
});
