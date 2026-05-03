export const DETAIL_STALE_MS = 5 * 60 * 1000

export function shouldRunDetailEnrichment({
  force,
  previousSyncAt,
  now,
}: {
  force: boolean
  previousSyncAt: number | null
  now: number
}): boolean {
  if (force) return true
  if (previousSyncAt === null) return true
  return now - previousSyncAt >= DETAIL_STALE_MS
}
