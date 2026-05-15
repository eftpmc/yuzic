import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { selectAudioQuality } from '@/utils/redux/selectors/settingsSelectors';
import { setAudioQuality, AudioQuality as AudioQualityType } from '@/utils/redux/slices/settingsSlice';
import ChecklistSection from '@/screens/settings/components/ChecklistSection';

const QUALITY_OPTIONS = [
    { key: 'low' as const, labelKey: 'settings.library.audioQuality.options.low' },
    { key: 'medium' as const, labelKey: 'settings.library.audioQuality.options.medium' },
    { key: 'high' as const, labelKey: 'settings.library.audioQuality.options.high' },
    { key: 'original' as const, labelKey: 'settings.library.audioQuality.options.original' },
] as const;

const AudioQuality: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const audioQuality = useSelector(selectAudioQuality);

    const items = QUALITY_OPTIONS.map(o => ({ key: o.key, label: t(o.labelKey) }));

    return (
        <ChecklistSection
            infoText={t('settings.library.audioQuality.info')}
            items={items}
            isSelected={key => audioQuality === key}
            onSelect={key => dispatch(setAudioQuality(key as AudioQualityType))}
        />
    );
};

export default AudioQuality;
