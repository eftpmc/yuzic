import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../components/SettingsScreen';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import StreamingQuality from './components/StreamingQuality';
import { selectPreferredCodec } from '@/utils/redux/selectors/settingsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { setPreferredCodec } from '@/utils/redux/slices/settingsSlice';

const PlayerSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const preferredCodec = useSelector(selectPreferredCodec);
  const activeServer = useSelector(selectActiveServer);
  const supportsOpus = activeServer?.type === 'jellyfin' || activeServer?.type === 'emby';

  return (
    <SettingsScreen title={t('settings.player.title')}>
      <StreamingQuality />
      {supportsOpus && (
        <SettingsToggleGroup
          items={[
            {
              label: t('settings.player.opusCodec'),
              subtext: t('settings.player.opusCodecSubtext'),
              value: preferredCodec === 'opus',
              onValueChange: v => dispatch(setPreferredCodec(v ? 'opus' : 'mp3')),
            },
          ]}
        />
      )}
    </SettingsScreen>
  );
};

export default PlayerSettings;
