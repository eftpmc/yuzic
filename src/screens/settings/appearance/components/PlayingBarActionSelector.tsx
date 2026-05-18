import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { selectPlayingBarAction } from '@/utils/redux/selectors/settingsSelectors';
import { setPlayingBarAction } from '@/utils/redux/slices/settingsSlice';
import { PLAYING_BAR_ACTIONS } from '@/screens/playing/playingBar/actions/Actions';
import SettingsButtonSelect from '../../components/SettingsButtonSelect';

export const PlayingBarActionSelector: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const selected = useSelector(selectPlayingBarAction);

  return (
    <SettingsButtonSelect
      caption={t('settings.appearance.playingBarAction.info')}
      items={PLAYING_BAR_ACTIONS.map(action => ({
        id: action.id,
        icon: action.icon as React.ReactElement,
      }))}
      selected={selected}
      onSelect={id => dispatch(setPlayingBarAction(id))}
    />
  );
};
