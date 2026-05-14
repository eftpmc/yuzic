import { useState, useCallback } from 'react'
import { mmkv } from '@/utils/mmkvStorage'
import type { ExternalSource } from '@/screens/explore/components/SourceToggleBar'

const STORAGE_KEY = 'explore:activeSource'

function readPersistedSource(): ExternalSource | null {
  const stored = mmkv.getString(STORAGE_KEY)
  if (stored === 'deezer') return 'deezer'
  return null
}

export function usePersistedActiveSource() {
  const [activeSource, setActiveSourceState] = useState<ExternalSource | null>(readPersistedSource)

  const toggle = useCallback((source: ExternalSource) => {
    setActiveSourceState(prev => {
      const next = prev === source ? null : source
      if (next === null) mmkv.remove(STORAGE_KEY)
      else mmkv.set(STORAGE_KEY, next)
      return next
    })
  }, [])

  return { activeSource, toggle }
}
