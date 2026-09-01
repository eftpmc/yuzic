import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { selectWifiStreamQuality, selectCellularStreamQuality } from '@/utils/redux/selectors/settingsSelectors';
import { setWifiStreamQuality, setCellularStreamQuality, AudioQuality } from '@/utils/redux/slices/settingsSlice';
import SettingsSelectCard from '../../components/SettingsSelectCard';
import { useTheme } from '@/hooks/useTheme';
import { DOWNLOAD_QUALITY_OPTIONS } from '@/constants/settings';
import { typography } from '@/constants/design';

const StreamingQuality: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const wifiQuality = useSelector(selectWifiStreamQuality);
  const cellularQuality = useSelector(selectCellularStreamQuality);

  const items = DOWNLOAD_QUALITY_OPTIONS.map(o => ({ key: o.key, label: t(o.labelKey) }));

  return (
    <>
      <SettingsSelectCard
        title={t('settings.player.streamingQuality.wifi')}
        items={items}
        isSelected={key => wifiQuality === key}
        onSelect={key => dispatch(setWifiStreamQuality(key as AudioQuality))}
      />
      <SettingsSelectCard
        title={t('settings.player.streamingQuality.cellular')}
        items={items}
        isSelected={key => cellularQuality === key}
        onSelect={key => dispatch(setCellularStreamQuality(key as AudioQuality))}
      />
      <Text style={[styles.caption, { color: colors.subtext }]}>
        {t('settings.player.streamingQuality.caption')}
      </Text>
    </>
  );
};

export default StreamingQuality;

const styles = StyleSheet.create({
  caption: {
    ...typography.caption,
    marginTop: 8,
    marginHorizontal: 4,
  },
});
