import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';

const Equalizer: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode, colors } = useTheme();

  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('settings.player.equalizer.title')}
      </Text>
      <Text style={[styles.body, { color: colors.subtext }]}>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
});
