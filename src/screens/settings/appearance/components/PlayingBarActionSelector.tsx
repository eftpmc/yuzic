import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { selectPlayingBarAction } from '@/utils/redux/selectors/settingsSelectors';
import { setPlayingBarAction, PlayingBarAction } from '@/utils/redux/slices/settingsSlice';
import { PLAYING_BAR_ACTIONS } from '@/screens/playing/playingBar/actions/Actions';
import SettingsIconSelectCard from '../../components/SettingsIconSelectCard';

export const PlayingBarActionSelector: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const selected = useSelector(selectPlayingBarAction);

  return (
    <SettingsIconSelectCard
      title={t('settings.appearance.playingBarAction.info')}
      items={PLAYING_BAR_ACTIONS.map(action => ({
        id: action.id,
        icon: action.icon as React.ReactElement<{ color?: string }>,
      }))}
      selected={selected}
      onSelect={id => dispatch(setPlayingBarAction(id as PlayingBarAction))}
    />
  );
};
