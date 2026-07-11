export type QueueSong = {
  id: string
}

export type PlayNextQueueUpdate<T extends QueueSong> = {
  queue: T[]
  currentIndex: number
  insertIndex: number
  removedIndex: number | null
}

export function moveSongAfterCurrent<T extends QueueSong>(
  queue: T[],
  currentIndex: number,
  song: T,
): PlayNextQueueUpdate<T> | null {
  const current = queue[currentIndex]
  if (!current || current.id === song.id) return null

  const removedIndex = queue.findIndex(item => item.id === song.id)
  const withoutSong = removedIndex === -1
    ? [...queue]
    : queue.filter(item => item.id !== song.id)

  const adjustedCurrentIndex = withoutSong.findIndex(item => item.id === current.id)
  if (adjustedCurrentIndex === -1) return null

  const insertIndex = adjustedCurrentIndex + 1
  withoutSong.splice(insertIndex, 0, song)

  return {
    queue: withoutSong,
    currentIndex: adjustedCurrentIndex,
    insertIndex,
    removedIndex: removedIndex === -1 ? null : removedIndex,
  }
}

// Restoring a pre-shuffle snapshot verbatim would silently drop anything
// added to the live (shuffled) queue since shuffling started, and resurrect
// anything removed from it (e.g. a track dropped after a playback failure).
// Keep snapshot entries still present in the live queue, then append
// whatever's in the live queue that the snapshot doesn't know about.
export function reconcileUnshuffledQueue<T extends QueueSong>(
  originalQueue: T[],
  liveQueue: T[],
): T[] {
  const liveIds = new Set(liveQueue.map(item => item.id))
  const restoredBase = originalQueue.filter(item => liveIds.has(item.id))
  const restoredIds = new Set(restoredBase.map(item => item.id))
  const addedWhileShuffled = liveQueue.filter(item => !restoredIds.has(item.id))
  return [...restoredBase, ...addedWhileShuffled]
}
