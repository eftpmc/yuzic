import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';

const Equalizer: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {t('settings.player.equalizer.title')}
      </Text>
      <Text style={[styles.body, isDarkMode && styles.bodyDark]}>
        Equalizer controls are temporarily unavailable with the new playback engine.
      </Text>
    </View>
  );
};

export default Equalizer;

const styles = StyleSheet.create({
  section: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 24,
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  titleDark: {
    color: '#fff',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  bodyDark: {
    color: '#aaa',
  },
});
