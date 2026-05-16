import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/api';
import { CheckCircle, XCircle } from 'lucide-react-native';

import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsDivider from '../components/SettingsDivider';
import SettingsToggleRow from '../components/SettingsToggleRow';
import ChecklistSection from '../components/ChecklistSection';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useTheme } from '@/hooks/useTheme';
import {
  selectSearchScope,
  selectServerScrobbleEnabled,
  selectServerNowPlayingEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setSearchScope,
  setServerScrobbleEnabled,
  setServerNowPlayingEnabled,
  type SearchScope,
} from '@/utils/redux/slices/settingsSlice';

const ICON_SIZE = 20;

const ServerSettings: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const api = useApi();
  const dispatch = useDispatch();

  const searchScope = useSelector(selectSearchScope);
  const activeServer = useSelector(selectActiveServer);
  const serverScrobbleEnabled = useSelector(selectServerScrobbleEnabled);
  const serverNowPlayingEnabled = useSelector(selectServerNowPlayingEnabled);
  const isNavidrome = activeServer?.type === 'navidrome';

  const [isLoading, setIsLoading] = useState(false);

  const serverUrl = activeServer?.serverUrl;
  const username = activeServer?.username;
  const isAuthenticated = activeServer?.isAuthenticated;

  useEffect(() => {
    if (!api || !serverUrl) return;

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        await api.auth.ping();
      } catch {
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [api, serverUrl]);

  if (!activeServer) return null;

  return (
    <SettingsScreen title={t('settings.server.title')}>
      <SettingsCard>
        <View style={styles.row}>
          <Text style={[styles.rowText, { color: colors.text }]}>
            {t('settings.server.serverUrl')}
          </Text>
          <Text style={[styles.rowValue, { color: colors.subtext }]} numberOfLines={1}>
            {serverUrl || t('settings.server.notSet')}
          </Text>
        </View>

        <SettingsDivider />

        <View style={styles.row}>
          <Text style={[styles.rowText, { color: colors.text }]}>
            {t('settings.server.username')}
          </Text>
          <Text style={[styles.rowValue, { color: colors.subtext }]} numberOfLines={1}>
            {username || t('settings.server.notSet')}
          </Text>
        </View>

        <SettingsDivider />

        <View style={styles.row}>
          <Text style={[styles.rowText, { color: colors.text }]}>
            {t('settings.server.connectivity')}
          </Text>
          <View style={styles.iconSlot}>
            {isLoading ? (
              <SpinningLoaderCircle size={ICON_SIZE} color={colors.themeColor} />
            ) : isAuthenticated ? (
              <CheckCircle size={ICON_SIZE} color={colors.themeColor} />
            ) : (
              <XCircle size={ICON_SIZE} color="red" />
            )}
          </View>
        </View>
      </SettingsCard>

      <ChecklistSection
        infoText={t('settings.server.searchScopeHelp')}
        items={[
          { key: 'client', label: t('settings.server.searchScope.client') },
          { key: 'server', label: t('settings.server.searchScope.server') },
        ]}
        isSelected={key => searchScope === key}
        onSelect={key => dispatch(setSearchScope(key as SearchScope))}
      />

      {isNavidrome && (
        <SettingsCard>
          <SettingsToggleRow
            label={t('settings.scrobbling.scrobble')}
            subtext={t('settings.scrobbling.scrobbleDescription')}
            value={serverScrobbleEnabled}
            onValueChange={v => { dispatch(setServerScrobbleEnabled(v)); }}
          />
          <SettingsDivider />
          <SettingsToggleRow
            label={t('settings.scrobbling.nowPlaying')}
            subtext={t('settings.scrobbling.nowPlayingDescription')}
            value={serverNowPlayingEnabled}
            onValueChange={v => { dispatch(setServerNowPlayingEnabled(v)); }}
          />
        </SettingsCard>
      )}
    </SettingsScreen>
  );
};

export default ServerSettings;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 16,
  },
  rowText: { fontSize: 16 },
  rowValue: {
    fontSize: 15,
    flexShrink: 1,
    textAlign: 'right',
  },
  iconSlot: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
