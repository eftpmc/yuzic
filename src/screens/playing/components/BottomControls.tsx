import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Cast, ListMusic } from 'lucide-react-native';
import { useCast } from '@/contexts/CastContext';
import Touchable from '@/components/Touchable';

type BottomControlsProps = {
  mode: 'player' | 'queue';
  setMode: (mode: 'player' | 'queue') => void;
  onOpenOutputSheet: () => void;
};

const BottomControls: React.FC<BottomControlsProps> = ({ mode, setMode, onOpenOutputSheet }) => {
  const { activeDevice } = useCast();
  const isCasting = activeDevice != null;
  const iconColor = (active: boolean) => (active ? '#fff' : '#ccc');

  return (
    <View style={styles.container}>
      <Touchable onPress={onOpenOutputSheet} style={styles.leftButton}>
        <Cast size={24} color={isCasting ? '#fff' : '#ccc'} />
      </Touchable>

      <Touchable
        testID="playing-queue-toggle"
        accessibilityRole="button"
        accessibilityLabel="Toggle queue"
        onPress={() => setMode(mode === 'queue' ? 'player' : 'queue')}
        style={[styles.rightButton, mode === 'queue' && styles.activeButton]}
      >
        <ListMusic size={24} color={iconColor(mode === 'queue')} />
      </Touchable>
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
