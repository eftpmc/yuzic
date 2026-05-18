import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectLanguage } from '@/utils/redux/selectors/settingsSelectors';
import { setLanguage } from '@/utils/redux/slices/settingsSlice';
import { getLanguageByCode } from '@/constants/languages';
import { useTranslation } from 'react-i18next';
import LanguageBottomSheet from './LanguageBottomSheet';
import { useSheetRef } from '@/utils/useSheetRef';
import SettingsCard from '../../components/SettingsCard';
import SettingsRow from '../../components/SettingsRow';

export const LanguageSelector: React.FC = () => {
  const dispatch = useDispatch();
  const selected = useSelector(selectLanguage);
  const { t } = useTranslation();
  const bottomSheetRef = useSheetRef();

  const selectedLabel = getLanguageByCode(selected)?.nativeName ?? selected;

  const handleOpen = useCallback(() => {
    bottomSheetRef.current?.present();
  }, [bottomSheetRef]);

  const handleSelect = useCallback(
    (code: string) => {
      dispatch(setLanguage(code));
      bottomSheetRef.current?.dismiss();
    },
    [bottomSheetRef, dispatch],
  );

  return (
    <>
      <SettingsCard>
        <SettingsRow
          label={t('settings.appearance.language.title')}
          rightText={selectedLabel}
          onPress={handleOpen}
        />
      </SettingsCard>
      <LanguageBottomSheet
        ref={bottomSheetRef}
        selected={selected}
        onSelect={handleSelect}
      />
    </>
  );
};
