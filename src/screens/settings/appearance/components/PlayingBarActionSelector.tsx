import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import {
  selectPlayingBarAction,
  selectThemeColor,
} from '@/utils/redux/selectors/settingsSelectors';
import { setPlayingBarAction } from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';
import {
  PLAYING_BAR_ACTIONS
} from '@/screens/playing/playingBar/actions/Actions';

export const PlayingBarActionSelector: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const selected = useSelector(selectPlayingBarAction);
  const { isDarkMode, colors } = useTheme();

  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
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
                  backgroundColor: active ? themeColor : colors.muted,
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
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
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