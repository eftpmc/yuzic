import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsScreen from '../components/SettingsScreen';
import Equalizer from '../player/components/Equalizer';

/**
 * The equalizer, on a screen of its own.
 *
 * It used to sit inline in Playback, and the gesture was ambiguous in a way
 * that cost the user their settings: the bands are rotated sliders, so a
 * vertical drag is *both* "scroll the page" and "change this band". With a
 * flat EQ every thumb sits on the card's midline — exactly where a thumb lands
 * when you swipe through the middle of the screen to reach what is below — so
 * scrolling past the equalizer moved a band instead, silently.
 *
 * There is no way to disambiguate two identical gestures, so the fix is to
 * stop asking: on its own screen nothing sits below the bands, and scrolling
 * past them is not something anyone needs to do.
 */
const EqualizerSettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <SettingsScreen title={t('settings.player.equalizer.title')}>
      <Equalizer />
    </SettingsScreen>
  );
};

export default EqualizerSettings;
