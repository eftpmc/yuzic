import { moveSongAfterCurrent, reconcileUnshuffledQueue } from './playingQueue'

const song = (id: string) => ({ id })

describe('moveSongAfterCurrent', () => {
  it('inserts a new song directly after the current song', () => {
    const result = moveSongAfterCurrent(
      [song('a'), song('b'), song('c')],
      1,
      song('x'),
    )

    expect(result?.queue.map(item => item.id)).toEqual(['a', 'b', 'x', 'c'])
    expect(result?.currentIndex).toBe(1)
    expect(result?.insertIndex).toBe(2)
    expect(result?.removedIndex).toBeNull()
  })

  it('moves an earlier queued song after current and adjusts the current index', () => {
    const result = moveSongAfterCurrent(
      [song('a'), song('b'), song('c'), song('d')],
      2,
      song('a'),
    )

    expect(result?.queue.map(item => item.id)).toEqual(['b', 'c', 'a', 'd'])
    expect(result?.currentIndex).toBe(1)
    expect(result?.insertIndex).toBe(2)
    expect(result?.removedIndex).toBe(0)
  })

  it('moves a later queued song after current without shifting current', () => {
    const result = moveSongAfterCurrent(
      [song('a'), song('b'), song('c'), song('d')],
      1,
      song('d'),
    )

    expect(result?.queue.map(item => item.id)).toEqual(['a', 'b', 'd', 'c'])
    expect(result?.currentIndex).toBe(1)
    expect(result?.insertIndex).toBe(2)
    expect(result?.removedIndex).toBe(3)
  })

  it('does nothing when asked to play the current song next', () => {
    const result = moveSongAfterCurrent(
      [song('a'), song('b'), song('c')],
      1,
      song('b'),
    )

    expect(result).toBeNull()
  })
})

describe('reconcileUnshuffledQueue', () => {
  it('restores the original order unchanged when nothing was added or removed', () => {
    const result = reconcileUnshuffledQueue(
      [song('a'), song('b'), song('c')],
      [song('c'), song('a'), song('b')],
    )

    expect(result.map(item => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('appends a song added to the live queue while shuffled instead of dropping it', () => {
    // Regression: addToQueue/playNext/etc. only mutate the live shuffled
    // queue, never the pre-shuffle snapshot — restoring the snapshot as-is
    // used to silently drop anything added during shuffle playback.
    const result = reconcileUnshuffledQueue(
      [song('a'), song('b'), song('c')],
      [song('b'), song('a'), song('x'), song('c')],
    )

    expect(result.map(item => item.id)).toEqual(['a', 'b', 'c', 'x'])
  })

  it('does not resurrect a song removed from the live queue while shuffled', () => {
    const result = reconcileUnshuffledQueue(
      [song('a'), song('b'), song('c')],
      [song('c'), song('a')],
    )

    expect(result.map(item => item.id)).toEqual(['a', 'c'])
  })
})
