import React from 'react';
import { Minus, SkipForward, Heart, Dices, Cast, PlusCircle } from 'lucide-react-native';
import { PlayingBarAction } from '@/utils/redux/slices/settingsSlice';

export type PlayingBarActionMeta = {
  id: PlayingBarAction;
  icon: React.ReactNode;
};

export const PLAYING_BAR_ACTIONS: PlayingBarActionMeta[] = [
  {
    id: 'none',
    icon: <Minus size={20} />,
  },
  {
    id: 'skip',
    icon: <SkipForward size={20} />,
  },
  {
    id: 'favorite',
    icon: <Heart size={20} />,
  },
  {
    id: 'randomAlbum',
    icon: <Dices size={20} />,
  },
  {
    id: 'addToPlaylist',
    icon: <PlusCircle size={20} />,
  },
  {
    id: 'cast',
    icon: <Cast size={20} />,
  },
];