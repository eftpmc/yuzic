import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { SortOrder } from './librarySort'

/** Shared so the tab and every per-type screen name the orders identically. */
export function useSortLabels(): Record<SortOrder, string> {
  const { t } = useTranslation()
  return useMemo(() => ({
    recent: t('home.sort.mostRecent'),
    recentlyAdded: t('home.sort.recentlyAdded'),
    title: t('home.sort.alphabetical'),
    year: t('home.sort.releaseYear'),
    userplays: t('home.sort.mostPlayed'),
  }), [t])
}
