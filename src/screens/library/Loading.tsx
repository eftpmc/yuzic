import React, { useMemo } from 'react'
import { FlashList } from '@shopify/flash-list'

import SkeletonListRow from '@/components/SkeletonListRow'

const PLACEHOLDER_ROWS = 8

/**
 * Placeholder for a library collection while its first sync runs. Rows rather
 * than a spinner, so the screen keeps the shape it is about to have instead of
 * jumping from a centred dot to a full list.
 */
const LoadingLibraryList: React.FC = () => {
  const data = useMemo(() => Array.from({ length: PLACEHOLDER_ROWS }), [])

  return (
    <FlashList
      data={data}
      keyExtractor={(_, index) => `library-loading-${index}`}
      renderItem={({ index }) => <SkeletonListRow key={index} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 140 }}
    />
  )
}

export default LoadingLibraryList
