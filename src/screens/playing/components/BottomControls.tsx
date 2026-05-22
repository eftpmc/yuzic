import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Cast, ListMusic } from 'lucide-react-native';
import { useCast } from '@/contexts/CastContext';

type BottomControlsProps = {
  mode: 'player' | 'queue';
  setMode: (mode: 'player' | 'queue') => void;
  onOpenOutputSheet: () => void;
};

const BottomControls: React.FC<BottomControlsProps> = ({ mode, setMode, onOpenOutputSheet }) => {
  const { activeDevice, isGoogleCastConnected } = useCast();
  const isCasting = activeDevice != null || isGoogleCastConnected;
  const iconColor = (active: boolean) => (active ? '#fff' : '#ccc');

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onOpenOutputSheet} style={styles.leftButton}>
        <Cast size={24} color={isCasting ? '#fff' : '#ccc'} />
      </TouchableOpacity>

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
});

export default BottomControls;
