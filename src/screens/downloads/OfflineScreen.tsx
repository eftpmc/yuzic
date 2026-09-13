import React from 'react';
import { useTranslation } from 'react-i18next';

import SettingsScreen from '../settings/components/SettingsScreen';
import OfflineSection from './OfflineSection';

/**
 * The Offline screen — music saved on THIS device, with its storage summary,
 * every downloaded item, and the controls to remove them or clear a provider.
 *
 * This is the device side of downloads and is deliberately separate from the
 * Downloads screen, which is server transfer activity only. One is what you
 * hold offline; the other is work in flight. Merging them onto one screen read
 * as a single confusing pile, so they live apart.
 */
const OfflineScreen: React.FC = () => {
  const { t } = useTranslation();
  return (
    <SettingsScreen title={t('library.downloaded.title')}>
      <OfflineSection />
    </SettingsScreen>
  );
};

export default OfflineScreen;
