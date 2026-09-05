import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'

/**
 * A source's heading and the shelves under it, where the heading only appears
 * if at least one shelf has something to show.
 *
 * Home's sections decide for themselves whether they have anything — a
 * similar-artists shelf with no seed, a now-playing shelf on a server where
 * nobody is listening — and return nothing when they don't. The source
 * headings above them had no way to know that, so "ListenBrainz" and "On your
 * server" could sit over empty space: a label for a section that isn't there.
 *
 * A shelf is assumed present until it says otherwise, so a section that always
 * renders (the Deezer shelves all have empty states of their own) needs to
 * know nothing about this. Only the ones that can vanish call
 * `useSourceSectionPresence`.
 */
type ReportPresence = (key: string, present: boolean) => void

const PresenceContext = createContext<ReportPresence | null>(null)

/**
 * Tell the enclosing source group whether this shelf is rendering anything.
 *
 * Call it before any early return, and pass the same condition that guards the
 * shelf's own output. Reported in a layout effect so the heading is gone in the
 * same frame the shelf decides to hide, rather than flashing for one paint.
 */
export function useSourceSectionPresence(key: string, present: boolean): void {
  const report = useContext(PresenceContext)
  useLayoutEffect(() => {
    if (!report) return
    report(key, present)
    return () => report(key, true)
  }, [report, key, present])
}

type Props = {
  /** Every section key this group renders, so each starts out assumed present. */
  sectionKeys: string[]
  header: React.ReactNode
  children: React.ReactNode
}

export default function SourceGroup({ sectionKeys, header, children }: Props) {
  const [absent, setAbsent] = useState<Record<string, true>>({})

  const report = useCallback<ReportPresence>((key, present) => {
    setAbsent(prev => {
      if (present) {
        if (!(key in prev)) return prev
        const next = { ...prev }
        delete next[key]
        return next
      }
      if (prev[key]) return prev
      return { ...prev, [key]: true }
    })
  }, [])

  const anyPresent = useMemo(
    () => sectionKeys.some(key => !absent[key]),
    [sectionKeys, absent]
  )

  return (
    <PresenceContext.Provider value={report}>
      {anyPresent && header}
      {children}
    </PresenceContext.Provider>
  )
}
