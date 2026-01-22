import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { PlayingBarAction } from '@/utils/redux/slices/settingsSlice';

export type PlayingBarActionMeta = {
  id: PlayingBarAction;
  icon: React.ReactNode;
};

export const PLAYING_BAR_ACTIONS: PlayingBarActionMeta[] = [
  {
    id: 'none',
    icon: <Ionicons name="remove" size={20} />,
  },
  {
    id: 'skip',
    icon: <Ionicons name="play-skip-forward" size={20} />,
  },
  {
    id: 'favorite',
    icon: <Ionicons name="heart-outline" size={20} />,
  },
];