import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Cast, ListMusic } from 'lucide-react-native';
import { useCast } from '@/contexts/CastContext';
import Touchable from '@/components/Touchable';
import { controlSize, hitSlopFor, onDark, spacing, stateLayer } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

type BottomControlsProps = {
  mode: 'player' | 'queue';
  setMode: (mode: 'player' | 'queue') => void;
  onOpenOutputSheet: () => void;
};

/** The size these two are drawn at. Below the 68pt play button and above
 *  nothing, they are the player's quietest controls — but a 24pt glyph with
 *  6pt of padding gave the active one a background barely larger than the
 *  icon, which read as a highlight that had slipped rather than as a control
 *  that was on. `hitSlopFor` takes the finger the rest of the way. */
const BUTTON_SIZE = controlSize.playerSecondary;

const BottomControls: React.FC<BottomControlsProps> = ({ mode, setMode, onOpenOutputSheet }) => {
  const { t } = useTranslation();
  const { activeDevice } = useCast();
  const rad = useRadius();
  const isCasting = activeDevice != null;
  const showingQueue = mode === 'queue';

  // One way of saying "on" for both. The queue toggle used to get a filled
  // background and the cast button only a colour change, so a pair of controls
  // drawn side by side answered the same question two different ways.
  const buttonStyle = (active: boolean) => [
    styles.button,
    { borderRadius: rad.pillFor(BUTTON_SIZE) },
    active && styles.buttonActive,
  ];

  return (
    <View style={styles.container}>
      <Touchable
        testID="playing-output-toggle"
        accessibilityRole="button"
        accessibilityLabel={t('a11y.player.outputDevice')}
        accessibilityState={{ selected: isCasting }}
        onPress={onOpenOutputSheet}
        style={buttonStyle(isCasting)}
        hitSlop={hitSlopFor(BUTTON_SIZE)}
      >
        <Cast size={24} color={isCasting ? onDark.text : onDark.subtext} />
      </Touchable>

      <Touchable
        testID="playing-queue-toggle"
        accessibilityRole="button"
        accessibilityLabel={t('a11y.player.queue')}
        accessibilityState={{ selected: showingQueue }}
        onPress={() => setMode(showingQueue ? 'player' : 'queue')}
        style={buttonStyle(showingQueue)}
        hitSlop={hitSlopFor(BUTTON_SIZE)}
      >
        <ListMusic size={24} color={showingQueue ? onDark.text : onDark.subtext} />
      </Touchable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    // Pinned to opposite edges, these two read as a pair of glyphs that got
    // left behind rather than as a row of controls — the gap between them is
    // most of the screen and holds nothing. Centred as a cluster they read as
    // what they are: the player's two secondary destinations, one step below
    // the transport row above them.
    justifyContent: 'center',
    gap: spacing.generous,
    flex: 1,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: stateLayer.rippleDark,
  },
});

export default BottomControls;
