import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { selectPlayingBarAction } from '@/utils/redux/selectors/settingsSelectors';
import { setPlayingBarAction } from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';
import { PLAYING_BAR_ACTIONS } from '@/screens/playing/playingBar/actions/Actions';
import SettingsCard from '../../components/SettingsCard';

export const PlayingBarActionSelector: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const selected = useSelector(selectPlayingBarAction);
  const { colors } = useTheme();

  return (
    <SettingsCard style={styles.card}>
      <Text style={[styles.infoText, { color: colors.subtext }]}>
        {t('settings.appearance.playingBarAction.info')}
      </Text>

      <View style={styles.row}>
        {PLAYING_BAR_ACTIONS.map(action => {
          const active = selected === action.id;
          return (
            <TouchableOpacity
              key={action.id}
              onPress={() => dispatch(setPlayingBarAction(action.id))}
              style={[
                styles.button,
                {
                  backgroundColor: active ? colors.themeColor : colors.muted,
                  borderColor: colors.border,
                },
              ]}
            >
              {React.cloneElement(action.icon as React.ReactElement<any>, {
                color: active ? '#fff' : colors.text,
              })}
            </TouchableOpacity>
          );
        })}
      </View>
    </SettingsCard>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  infoText: {
    fontSize: 13,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  button: {
    width: 48,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
