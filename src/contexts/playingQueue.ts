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
