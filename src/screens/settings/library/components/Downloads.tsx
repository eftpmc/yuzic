import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useDownload } from '@/contexts/DownloadContext';
import { Paths } from 'expo-file-system';
import { formatBytes } from '@/utils/downloads/downloadStore';
import { selectAutoDownloadNewSongs } from '@/utils/redux/selectors/settingsSelectors';
import { setAutoDownloadNewSongs } from '@/utils/redux/slices/settingsSlice';
import SettingsCard from '../../components/SettingsCard';
import SettingsCardHeader from '../../components/SettingsCardHeader';
import SettingsDivider from '../../components/SettingsDivider';
import SettingsInfoRow from '../../components/SettingsInfoRow';
import SettingsRow from '../../components/SettingsRow';
import SettingsToggleRow from '../../components/SettingsToggleRow';

const Downloads: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch();
  const autoDownloadNewSongs = useSelector(selectAutoDownloadNewSongs);
  const { totalDownloadedBytes, downloadStateVersion } = useDownload();
  const [freeBytes, setFreeBytes] = useState<number | null>(null);

  useEffect(() => {
    setFreeBytes(Paths.availableDiskSpace);
  }, [downloadStateVersion]);

  const formattedSize = formatBytes(totalDownloadedBytes);
  const formattedAvailable = freeBytes != null ? formatBytes(freeBytes) : '—';

  return (
    <>
    <SettingsCardHeader subtle title={t('settings.library.downloads.title')} />
    <SettingsCard>
      <SettingsInfoRow
        label={t('settings.library.downloads.sizeLabel')}
        value={formattedSize}
        stacked
      />
      <SettingsDivider />
      <SettingsInfoRow
        label={t('settings.library.downloads.availableLabel')}
        value={formattedAvailable}
        stacked
      />
      <SettingsDivider />
      <SettingsToggleRow
        label={t('settings.library.downloads.autoDownloadLabel')}
        subtext={t('settings.library.downloads.autoDownloadSubtext')}
        value={autoDownloadNewSongs}
        onValueChange={value => dispatch(setAutoDownloadNewSongs(value))}
      />
      <SettingsDivider />
      <SettingsRow
        label={t('settings.library.downloads.moreInfo')}
        onPress={() => router.push('/settings/downloadsInfoView')}
      />
    </SettingsCard>
    </>
  );
};

export default Downloads;
