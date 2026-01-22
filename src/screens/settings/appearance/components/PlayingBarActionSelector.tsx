import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
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
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const selected = useSelector(selectPlayingBarAction);
  const { isDarkMode } = useTheme();

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
        Choose which action appears in the playing bar
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
                  backgroundColor: active
                    ? themeColor
                    : isDarkMode
                    ? '#222'
                    : '#eee',
                  borderColor: isDarkMode ? '#444' : '#ccc',
                },
              ]}
            >
              {React.cloneElement(action.icon as React.ReactElement, {
                color: active ? '#fff' : isDarkMode ? '#ccc' : '#000',
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
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 24,
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12,
  },
  infoTextDark: {
    color: '#aaa',
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