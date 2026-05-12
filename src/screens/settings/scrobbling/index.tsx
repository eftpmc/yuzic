import React from 'react';
import {
  ScrollView,
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import Header from '../components/Header';
import { useTheme } from '@/hooks/useTheme';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import {
  selectServerScrobbleEnabled,
  selectServerNowPlayingEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setServerScrobbleEnabled,
  setServerNowPlayingEnabled,
} from '@/utils/redux/slices/settingsSlice';
import {
  selectListenBrainzAuthenticated,
  selectListenBrainzScrobbleEnabled,
  selectListenBrainzNowPlayingEnabled,
} from '@/utils/redux/selectors/listenbrainzSelectors';
import {
  setScrobbleEnabled as setLbScrobbleEnabled,
  setNowPlayingEnabled as setLbNowPlayingEnabled,
} from '@/utils/redux/slices/listenbrainzSlice';
import {
  selectLastFmAuthenticated,
  selectLastFmScrobbleEnabled,
  selectLastFmNowPlayingEnabled,
} from '@/utils/redux/selectors/lastfmSelectors';
import {
  setScrobbleEnabled as setLfmScrobbleEnabled,
  setNowPlayingEnabled as setLfmNowPlayingEnabled,
} from '@/utils/redux/slices/lastfmSlice';

const ScrobblingView: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const activeServer = useSelector(selectActiveServer);
  const serverId = activeServer?.id ?? '';

  const serverScrobbleEnabled = useSelector(selectServerScrobbleEnabled);
  const serverNowPlayingEnabled = useSelector(selectServerNowPlayingEnabled);

  const lbAuthenticated = useSelector(selectListenBrainzAuthenticated);
  const lbScrobbleEnabled = useSelector(selectListenBrainzScrobbleEnabled);
  const lbNowPlayingEnabled = useSelector(selectListenBrainzNowPlayingEnabled);

  const lfmAuthenticated = useSelector(selectLastFmAuthenticated);
  const lfmScrobbleEnabled = useSelector(selectLastFmScrobbleEnabled);
  const lfmNowPlayingEnabled = useSelector(selectLastFmNowPlayingEnabled);

  const isNavidrome = activeServer?.type === 'navidrome';

  if (!activeServer) return null;

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Header title={t('settings.scrobbling.title')} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isNavidrome && (
          <>
            <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
              {t('settings.scrobbling.server')}
            </Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              <View style={styles.row}>
                <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                  {t('settings.scrobbling.scrobble')}
                </Text>
                <Switch
                  value={serverScrobbleEnabled}
                  onValueChange={(v) => {
                    dispatch(setServerScrobbleEnabled(v));
                  }}
                  trackColor={{ true: themeColor }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[styles.divider, isDarkMode && styles.dividerDark]} />
              <View style={styles.row}>
                <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                  {t('settings.scrobbling.nowPlaying')}
                </Text>
                <Switch
                  value={serverNowPlayingEnabled}
                  onValueChange={(v) => {
                    dispatch(setServerNowPlayingEnabled(v));
                  }}
                  trackColor={{ true: themeColor }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          ListenBrainz
        </Text>
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          {lbAuthenticated ? (
            <>
              <View style={styles.row}>
                <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                  {t('settings.scrobbling.scrobble')}
                </Text>
                <Switch
                  value={lbScrobbleEnabled}
                  onValueChange={(v) => {
                    dispatch(setLbScrobbleEnabled({ serverId, value: v }));
                  }}
                  trackColor={{ true: themeColor }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[styles.divider, isDarkMode && styles.dividerDark]} />
              <View style={styles.row}>
                <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                  {t('settings.scrobbling.nowPlaying')}
                </Text>
                <Switch
                  value={lbNowPlayingEnabled}
                  onValueChange={(v) => {
                    dispatch(setLbNowPlayingEnabled({ serverId, value: v }));
                  }}
                  trackColor={{ true: themeColor }}
                  thumbColor="#fff"
                />
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/settings/listenbrainzView')}
            >
              <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                {t('settings.scrobbling.notConnected')}
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={isDarkMode ? '#fff' : '#6E6E73'}
              />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          Last.fm
        </Text>
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          {lfmAuthenticated ? (
            <>
              <View style={styles.row}>
                <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                  {t('settings.scrobbling.scrobble')}
                </Text>
                <Switch
                  value={lfmScrobbleEnabled}
                  onValueChange={(v) => {
                    dispatch(setLfmScrobbleEnabled({ serverId, value: v }));
                  }}
                  trackColor={{ true: themeColor }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[styles.divider, isDarkMode && styles.dividerDark]} />
              <View style={styles.row}>
                <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                  {t('settings.scrobbling.nowPlaying')}
                </Text>
                <Switch
                  value={lfmNowPlayingEnabled}
                  onValueChange={(v) => {
                    dispatch(setLfmNowPlayingEnabled({ serverId, value: v }));
                  }}
                  trackColor={{ true: themeColor }}
                  thumbColor="#fff"
                />
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/settings/lastfmView')}
            >
              <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                {t('settings.scrobbling.notConnected')}
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={isDarkMode ? '#fff' : '#6E6E73'}
              />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ScrobblingView;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  containerDark: { backgroundColor: '#000' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
    marginLeft: 4,
    color: '#6E6E73',
  },
  sectionTitleDark: { color: '#aaa' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  sectionDark: { backgroundColor: '#1C1C1E' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowText: { fontSize: 16, color: '#1C1C1E' },
  rowTextDark: { color: '#fff' },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '92%',
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
  },
  dividerDark: { backgroundColor: '#2C2C2E' },
});
