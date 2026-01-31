import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { AirplayButton } from 'react-airplay';
import { ListMusic } from 'lucide-react-native';

type BottomControlsProps = {
  mode: 'player' | 'queue';
  setMode: (mode: 'player' | 'queue') => void;
};

const BottomControls: React.FC<BottomControlsProps> = ({
  mode,
  setMode,
}) => {
  const iconColor = (active: boolean) => (active ? '#fff' : '#ccc');

  return (
    <View style={styles.container}>
      <View style={styles.leftButton}>
        {Platform.OS === 'ios' ? (
          <AirplayButton
            activeTintColor="#fff"
            tintColor="#ccc"
            style={styles.airplay}
          />
        ) : (
          <View style={styles.airplayPlaceholder} />
        )}
      </View>

      <TouchableOpacity
        onPress={() => setMode(mode === 'queue' ? 'player' : 'queue')}
        style={[styles.rightButton, mode === 'queue' && styles.activeButton]}
      >
        <ListMusic size={24} color={iconColor(mode === 'queue')} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  leftButton: {
    padding: 6,
  },
  rightButton: {
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
