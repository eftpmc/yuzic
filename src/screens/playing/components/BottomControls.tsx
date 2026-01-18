import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AirplayButton } from 'react-airplay';
import { toast } from '@backpackapp-io/react-native-toast';

import { useTheme } from '@/hooks/useTheme';
import { ListMusic, MicVocal } from 'lucide-react-native';

type BottomControlsProps = {
  lyricsAvailable?: boolean;
  mode: 'player' | 'queue' | 'lyrics';
  setMode: (mode: 'player' | 'queue' | 'lyrics') => void;
};

const BottomControls: React.FC<BottomControlsProps> = ({
  lyricsAvailable = false,
  mode,
  setMode,
}) => {
  const { isDarkMode } = useTheme();

  const iconColor = (active: boolean, disabled?: boolean) => {
    if (disabled) return '#666';
    return active ? '#fff' : '#ccc';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          if (!lyricsAvailable) {
            toast.error("Lyrics aren’t available for this song");
            return;
          }
          setMode(mode === 'lyrics' ? 'player' : 'lyrics');
        }}
        style={[
          styles.button,
          mode === 'lyrics' && styles.activeButton,
        ]}
      >
        <MicVocal
          size={24}
          color={iconColor(mode === 'lyrics', !lyricsAvailable)}
        />
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <AirplayButton
          activeTintColor="#fff"
          tintColor="#ccc"
          style={styles.airplay}
        />
      ) : (
        <View style={styles.airplayPlaceholder} />
      )}

      <TouchableOpacity
        onPress={() => {
          setMode(mode === 'queue' ? 'player' : 'queue');
        }}
        style={[
          styles.button,
          mode === 'queue' && styles.activeButton,
        ]}
      >
        <ListMusic
          size={24}
          color={iconColor(mode === 'queue')}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  button: {
    padding: 6,
    borderRadius: 8,
  },
  activeButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  airplay: {
    width: 24,
    height: 24,
  },
  airplayPlaceholder: {
    width: 24,
    height: 24,
  },
});

export default BottomControls;