import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import Slider from '@react-native-community/slider';

import { useSettings } from '@/contexts/SettingsContext';

const TweaksSection: React.FC = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const { themeColor, weighting, setWeighting } = useSettings();

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <Text style={[styles.label, isDarkMode && styles.labelDark]}>
        Weight Tweaks
      </Text>

      <Text style={[styles.meta, isDarkMode && styles.metaDark]}>
        Global Play Count Weight: {weighting.global.toFixed(1)}
      </Text>
      <Slider
        value={weighting.global}
        minimumValue={0}
        maximumValue={5}
        step={0.1}
        onValueChange={(val) =>
          setWeighting({ ...weighting, global: val })
        }
        minimumTrackTintColor={themeColor}
        maximumTrackTintColor={isDarkMode ? '#444' : '#ccc'}
      />

      <Text style={[styles.meta, isDarkMode && styles.metaDark]}>
        User Play Count Weight: {weighting.user.toFixed(1)}
      </Text>
      <Slider
        value={weighting.user}
        minimumValue={0}
        maximumValue={5}
        step={0.1}
        onValueChange={(val) =>
          setWeighting({ ...weighting, user: val })
        }
        minimumTrackTintColor={themeColor}
        maximumTrackTintColor={isDarkMode ? '#444' : '#ccc'}
      />

      <Text style={[styles.meta, isDarkMode && styles.metaDark]}>
        Favorite Song Boost: {weighting.favorite.toFixed(1)}
      </Text>
      <Slider
        value={weighting.favorite}
        minimumValue={1}
        maximumValue={5}
        step={0.1}
        onValueChange={(val) =>
          setWeighting({ ...weighting, favorite: val })
        }
        minimumTrackTintColor={themeColor}
        maximumTrackTintColor={isDarkMode ? '#444' : '#ccc'}
      />
    </View>
  );
};

export default TweaksSection;

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#000',
  },
  labelDark: {
    color: '#fff',
  },
  meta: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  metaDark: {
    color: '#999',
  },
});