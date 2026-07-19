import reducer, {
  addSearchQuery,
  removeSearchQuery,
  clearSearchHistory,
} from './searchHistorySlice'

describe('searchHistorySlice', () => {
  it('adds a query to the front of the history for that server', () => {
    let state = reducer(undefined, addSearchQuery({ serverId: 's1', query: 'taylor swift' }))
    state = reducer(state, addSearchQuery({ serverId: 's1', query: 'radiohead' }))

    expect(state.byServer.s1).toEqual(['radiohead', 'taylor swift'])
  })

  it('moves a re-searched query back to the front instead of duplicating it', () => {
    let state = reducer(undefined, addSearchQuery({ serverId: 's1', query: 'taylor swift' }))
    state = reducer(state, addSearchQuery({ serverId: 's1', query: 'radiohead' }))
    state = reducer(state, addSearchQuery({ serverId: 's1', query: 'Taylor Swift' }))

    expect(state.byServer.s1).toEqual(['Taylor Swift', 'radiohead'])
  })

  it('ignores empty or whitespace-only queries', () => {
    const state = reducer(undefined, addSearchQuery({ serverId: 's1', query: '   ' }))
    expect(state.byServer.s1).toBeUndefined()
  })

  it('caps history at 10 entries per server, dropping the oldest', () => {
    let state = reducer(undefined, { type: 'init' } as any)
    for (let i = 0; i < 12; i++) {
      state = reducer(state, addSearchQuery({ serverId: 's1', query: `q${i}` }))
    }

    expect(state.byServer.s1).toHaveLength(10)
    expect(state.byServer.s1[0]).toBe('q11')
    expect(state.byServer.s1).not.toContain('q0')
    expect(state.byServer.s1).not.toContain('q1')
  })

  it('keeps history separate per server', () => {
    let state = reducer(undefined, addSearchQuery({ serverId: 's1', query: 'a' }))
    state = reducer(state, addSearchQuery({ serverId: 's2', query: 'b' }))

    expect(state.byServer.s1).toEqual(['a'])
    expect(state.byServer.s2).toEqual(['b'])
  })

  it('removes a single query', () => {
    let state = reducer(undefined, addSearchQuery({ serverId: 's1', query: 'a' }))
    state = reducer(state, addSearchQuery({ serverId: 's1', query: 'b' }))
    state = reducer(state, removeSearchQuery({ serverId: 's1', query: 'a' }))

    expect(state.byServer.s1).toEqual(['b'])
  })

  it('clears all history for a server', () => {
    let state = reducer(undefined, addSearchQuery({ serverId: 's1', query: 'a' }))
    state = reducer(state, clearSearchHistory({ serverId: 's1' }))

    expect(state.byServer.s1).toEqual([])
  })
})
