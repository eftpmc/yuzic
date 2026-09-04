import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Cast, ListMusic } from 'lucide-react-native';
import { useCast } from '@/contexts/CastContext';
import Touchable from '@/components/Touchable';
import { onDark, spacing } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

type BottomControlsProps = {
  mode: 'player' | 'queue';
  setMode: (mode: 'player' | 'queue') => void;
  onOpenOutputSheet: () => void;
};

const BottomControls: React.FC<BottomControlsProps> = ({ mode, setMode, onOpenOutputSheet }) => {
  const { activeDevice } = useCast();
  const rad = useRadius();
  const isCasting = activeDevice != null;
  const iconColor = (active: boolean) => (active ? onDark.text : onDark.subtext);

  return (
    <View style={styles.container}>
      <Touchable onPress={onOpenOutputSheet} style={styles.leftButton}>
        <Cast size={24} color={isCasting ? onDark.text : onDark.subtext} />
      </Touchable>

      <Touchable
        testID="playing-queue-toggle"
        accessibilityRole="button"
        accessibilityLabel="Toggle queue"
        onPress={() => setMode(mode === 'queue' ? 'player' : 'queue')}
        style={[styles.rightButton, { borderRadius: rad.md }, mode === 'queue' && styles.activeButton]}
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
    padding: spacing.tight,
  },
  rightButton: {
    padding: spacing.tight,
  },
  activeButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});

export default BottomControls;
