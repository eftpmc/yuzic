import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import SettingsCard from '../../components/SettingsCard';

const Equalizer: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <SettingsCard style={styles.card}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('settings.player.equalizer.title')}
      </Text>
      <Text style={[styles.body, { color: colors.subtext }]}>
        Equalizer controls are temporarily unavailable with the new playback engine.
      </Text>
    </SettingsCard>
  );
};

export default Equalizer;

const styles = StyleSheet.create({
  card: {
    paddingVertical: 20,
    paddingHorizontal: 16,
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
