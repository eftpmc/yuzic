import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Appearance,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectOwnedAlbumsEnabled, selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { setOwnedAlbumsEnabled } from '@/utils/redux/slices/settingsSlice';

export const OwnedAlbumsToggle: React.FC = () => {
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const ownedAlbumsEnabled = useSelector(selectOwnedAlbumsEnabled);
  const isDarkMode = Appearance.getColorScheme() === 'dark';

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <View style={styles.row}>
        <Text style={[styles.label, isDarkMode && styles.labelDark]}>
          Hide unowned albums
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => dispatch(setOwnedAlbumsEnabled(!ownedAlbumsEnabled))}
          style={[
            styles.switch,
            {
              backgroundColor: ownedAlbumsEnabled
                ? themeColor
                : isDarkMode
                  ? '#333'
                  : '#ddd',
            },
          ]}
        >
          <View
            style={[
              styles.thumb,
              {
                backgroundColor: '#fff',
                transform: [
                  { translateX: ownedAlbumsEnabled ? 18 : 2 },
                ],
              },
            ]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 24,
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: '#555',
    flexShrink: 1,
    paddingRight: 12,
  },
  labelDark: {
    color: '#aaa',
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 6,
    marginLeft: 2,
    elevation: 2,
  },
});