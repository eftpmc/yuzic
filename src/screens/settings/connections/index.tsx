import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsDivider from '../components/SettingsDivider';
import SettingsRow from '../components/SettingsRow';
import { selectListenBrainzAuthenticated } from '@/utils/redux/selectors/listenbrainzSelectors';
import {
  selectAnyDeezerEnabled,
  selectMusicbrainzExternalEnabled,
  selectLastfmEnabled,
  selectListenbrainzDiscoveryEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import { selectAudiomuseEnabled } from '@/utils/redux/selectors/audiomuseSelectors';
import { useDownloaderStates } from '@/features/downloaders/registry';

/**
 * The single hub for every provider yuzic can connect to — merges the old
 * separate Integrations and Downloaders hubs (§4 of
 * docs/design-library-intent.md, commit 5330f4ee: Connections is meant to be
 * the one central place listing every connectable provider). Each row keeps
 * the exact label, status logic, and destination route the two old hubs used,
 * grouped the same way they were split before: library/discovery sources,
 * then downloaders.
 */
const ConnectionsView: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const isLbConnected = useSelector(selectListenBrainzAuthenticated);
  const isDeezerEnabled = useSelector(selectAnyDeezerEnabled);
  const isMusicbrainzEnabled = useSelector(selectMusicbrainzExternalEnabled);
  const isLastfmEnabled = useSelector(selectLastfmEnabled);
  const isLbDiscoveryEnabled = useSelector(selectListenbrainzDiscoveryEnabled);
  const isAudiomuseEnabled = useSelector(selectAudiomuseEnabled);
  const downloaders = useDownloaderStates();

  return (
    <SettingsScreen title={t('settings.sections.connections')}>
      <SettingsCardHeader title={t('settings.connections.sources')} subtle />
      <SettingsCard>
        <SettingsRow
          label="Deezer"
          status={isDeezerEnabled ? 'enabled' : 'disabled'}
          onPress={() => router.push('/settings/deezerView')}
        />
        <SettingsDivider />
        <SettingsRow
          label="MusicBrainz"
          status={isMusicbrainzEnabled ? 'enabled' : 'disabled'}
          onPress={() => router.push('/settings/musicbrainzView')}
        />
        <SettingsDivider />
        <SettingsRow
          label="Last.fm"
          status={isLastfmEnabled ? 'enabled' : 'disabled'}
          onPress={() => router.push('/settings/lastfmView')}
        />
        <SettingsDivider />
        <SettingsRow
          label="ListenBrainz"
          // Two independent things live behind this row — an account for
          // scrobbling, and a switch for the public discovery graph — so it
          // reads as on when either of them is.
          status={isLbConnected ? 'connected' : isLbDiscoveryEnabled ? 'enabled' : 'disconnected'}
          onPress={() => router.push('/settings/listenbrainzView')}
        />
        <SettingsDivider />
        <SettingsRow
          label="AudioMuse-AI"
          status={isAudiomuseEnabled ? 'enabled' : 'disabled'}
          onPress={() => router.push('/settings/audiomuseView')}
        />
      </SettingsCard>

      <SettingsCardHeader title={t('settings.downloaders.title')} subtle />
      <SettingsCard>
        {downloaders.map(({ def, isConnected }, index) => (
          <React.Fragment key={def.id}>
            {index > 0 && <SettingsDivider />}
            <SettingsRow
              label={t(`settings.downloaders.${def.id}.title`)}
              status={isConnected ? 'connected' : 'disconnected'}
              onPress={() => router.push(def.settingsRoute)}
            />
          </React.Fragment>
        ))}
      </SettingsCard>
    </SettingsScreen>
  );
};

export default ConnectionsView;
