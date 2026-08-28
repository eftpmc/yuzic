import reducer, {
  addSearchQuery,
  addSearchEntity,
  removeSearchEntry,
  clearSearchHistory,
  normalizeSearchHistoryEntries,
  searchHistoryEntryKey,
  MAX_QUERY_ENTRIES,
  MAX_ENTITY_ENTRIES,
  type SearchEntityEntry,
} from './searchHistorySlice'

const album = (id: string, title = `album ${id}`): Omit<SearchEntityEntry, 'kind'> => ({
  type: 'album',
  id,
  title,
  subtitle: 'Radiohead',
  cover: { kind: 'none' },
  source: 'local',
})

describe('searchHistorySlice', () => {
  it('adds a query to the front of the history for that server', () => {
    let state = reducer(undefined, addSearchQuery({ serverId: 's1', query: 'taylor swift' }))
    state = reducer(state, addSearchQuery({ serverId: 's1', query: 'radiohead' }))

    expect(state.byServer.s1).toEqual([
      { kind: 'query', text: 'radiohead' },
      { kind: 'query', text: 'taylor swift' },
    ])
  })

  it('moves a re-searched query back to the front instead of duplicating it', () => {
    let state = reducer(undefined, addSearchQuery({ serverId: 's1', query: 'taylor swift' }))
    state = reducer(state, addSearchQuery({ serverId: 's1', query: 'radiohead' }))
    state = reducer(state, addSearchQuery({ serverId: 's1', query: 'Taylor Swift' }))

    expect(state.byServer.s1).toEqual([
      { kind: 'query', text: 'Taylor Swift' },
      { kind: 'query', text: 'radiohead' },
    ])
  })

  it('ignores empty or whitespace-only queries', () => {
    const state = reducer(undefined, addSearchQuery({ serverId: 's1', query: '   ' }))
    expect(state.byServer.s1).toBeUndefined()
  })

  it('keeps history separate per server', () => {
    let state = reducer(undefined, addSearchQuery({ serverId: 's1', query: 'a' }))
    state = reducer(state, addSearchQuery({ serverId: 's2', query: 'b' }))

    expect(state.byServer.s1).toEqual([{ kind: 'query', text: 'a' }])
    expect(state.byServer.s2).toEqual([{ kind: 'query', text: 'b' }])
  })

  it('clears all history for a server', () => {
    let state = reducer(undefined, addSearchQuery({ serverId: 's1', query: 'a' }))
    state = reducer(state, clearSearchHistory({ serverId: 's1' }))

    expect(state.byServer.s1).toEqual([])
  })

  describe('entities', () => {
    it('records an opened item with the detail needed to render and reopen it', () => {
      const state = reducer(undefined, addSearchEntity({ serverId: 's1', entity: album('a1', 'Kid A') }))

      expect(state.byServer.s1).toEqual([{ kind: 'entity', ...album('a1', 'Kid A') }])
    })

    it('dedupes an entity by type and id, keeping the newest copy in front', () => {
      let state = reducer(undefined, addSearchEntity({ serverId: 's1', entity: album('a1', 'Kid A') }))
      state = reducer(state, addSearchEntity({ serverId: 's1', entity: album('a2', 'In Rainbows') }))
      state = reducer(state, addSearchEntity({ serverId: 's1', entity: album('a1', 'Kid A (Remaster)') }))

      expect(state.byServer.s1).toHaveLength(2)
      expect((state.byServer.s1[0] as SearchEntityEntry).title).toBe('Kid A (Remaster)')
    })

    it('treats an artist and an album sharing an id as different entries', () => {
      let state = reducer(undefined, addSearchEntity({ serverId: 's1', entity: album('same') }))
      state = reducer(state, addSearchEntity({
        serverId: 's1',
        entity: { ...album('same'), type: 'artist' },
      }))

      expect(state.byServer.s1).toHaveLength(2)
    })

    it('ignores entities missing an id or title', () => {
      let state = reducer(undefined, addSearchEntity({ serverId: 's1', entity: { ...album('a1'), id: '' } }))
      state = reducer(state, addSearchEntity({ serverId: 's1', entity: { ...album('a2'), title: '  ' } }))

      expect(state.byServer.s1 ?? []).toEqual([])
    })
  })

  describe('capping', () => {
    it('caps queries and entities independently so neither evicts the other', () => {
      let state = reducer(undefined, { type: 'init' } as any)
      for (let i = 0; i < MAX_ENTITY_ENTRIES + 3; i++) {
        state = reducer(state, addSearchEntity({ serverId: 's1', entity: album(`a${i}`) }))
      }
      for (let i = 0; i < MAX_QUERY_ENTRIES + 2; i++) {
        state = reducer(state, addSearchQuery({ serverId: 's1', query: `q${i}` }))
      }

      const entries = state.byServer.s1
      expect(entries.filter(e => e.kind === 'query')).toHaveLength(MAX_QUERY_ENTRIES)
      expect(entries.filter(e => e.kind === 'entity')).toHaveLength(MAX_ENTITY_ENTRIES)
    })

    it('drops the oldest of a kind when that kind overflows', () => {
      let state = reducer(undefined, { type: 'init' } as any)
      for (let i = 0; i < MAX_QUERY_ENTRIES + 2; i++) {
        state = reducer(state, addSearchQuery({ serverId: 's1', query: `q${i}` }))
      }

      const texts = state.byServer.s1.map(e => (e.kind === 'query' ? e.text : ''))
      expect(texts[0]).toBe(`q${MAX_QUERY_ENTRIES + 1}`)
      expect(texts).not.toContain('q0')
      expect(texts).not.toContain('q1')
    })
  })

  describe('removal by key', () => {
    it('removes a single query', () => {
      let state = reducer(undefined, addSearchQuery({ serverId: 's1', query: 'a' }))
      state = reducer(state, addSearchQuery({ serverId: 's1', query: 'b' }))
      state = reducer(state, removeSearchEntry({
        serverId: 's1',
        key: searchHistoryEntryKey({ kind: 'query', text: 'a' }),
      }))

      expect(state.byServer.s1).toEqual([{ kind: 'query', text: 'b' }])
    })

    it('removes a single entity without touching queries', () => {
      let state = reducer(undefined, addSearchQuery({ serverId: 's1', query: 'radiohead' }))
      state = reducer(state, addSearchEntity({ serverId: 's1', entity: album('a1') }))
      state = reducer(state, removeSearchEntry({
        serverId: 's1',
        key: searchHistoryEntryKey({ kind: 'entity', ...album('a1') }),
      }))

      expect(state.byServer.s1).toEqual([{ kind: 'query', text: 'radiohead' }])
    })
  })

  describe('normalizeSearchHistoryEntries', () => {
    it('lifts legacy bare strings into query entries', () => {
      expect(normalizeSearchHistoryEntries(['radiohead', 'taylor swift'])).toEqual([
        { kind: 'query', text: 'radiohead' },
        { kind: 'query', text: 'taylor swift' },
      ])
    })

    it('passes current entries through unchanged', () => {
      const entries = [{ kind: 'query', text: 'a' }, { kind: 'entity', ...album('a1') }]
      expect(normalizeSearchHistoryEntries(entries)).toEqual(entries)
    })

    it('drops malformed entries instead of surfacing them to a render', () => {
      expect(normalizeSearchHistoryEntries([
        '   ',
        null,
        42,
        { kind: 'entity', type: 'album' },
        { kind: 'entity', type: 'nonsense', id: 'x', title: 'y' },
        { kind: 'query', text: '' },
      ])).toEqual([])
    })

    it('returns an empty list for non-array input', () => {
      expect(normalizeSearchHistoryEntries(undefined)).toEqual([])
      expect(normalizeSearchHistoryEntries({ byServer: {} })).toEqual([])
    })
  })
})
