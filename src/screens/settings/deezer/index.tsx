import React from 'react';
import { ScrollView, View, Text, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import { useTheme } from '@/hooks/useTheme';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { selectDeezerEnabled } from '@/utils/redux/selectors/settingsSelectors';
import { setDeezerEnabled } from '@/utils/redux/slices/settingsSlice';

export default function DeezerSettings() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const enabled = useSelector(selectDeezerEnabled);

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Header title="Deezer" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                {t('settings.deezer.enable')}
              </Text>
              <Text style={[styles.sublabel, isDarkMode && styles.sublabelDark]}>
                {t('settings.deezer.enableDescription')}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={v => dispatch(setDeezerEnabled(v))}
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
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  containerDark: { backgroundColor: '#000' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  sectionDark: { backgroundColor: '#1C1C1E' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
  },
  rowText: { flex: 1 },
  label: { fontSize: 16, color: '#1C1C1E' },
  labelDark: { color: '#fff' },
  sublabel: { fontSize: 13, color: '#6E6E73', marginTop: 2 },
  sublabelDark: { color: '#aaa' },
});
