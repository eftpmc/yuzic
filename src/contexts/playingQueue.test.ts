import { moveSongAfterCurrent } from './playingQueue'

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
