import {
  hasArrayData,
  hasValue,
  selectOfflineFirstData,
} from './useOfflineFirstQuery'

describe('offline-first query helpers', () => {
  it('uses fallback data when query data has not restored yet', () => {
    expect(selectOfflineFirstData({
      queryData: undefined,
      fallbackData: ['cached'],
      hasFallbackData: hasArrayData,
    })).toEqual(['cached'])
  })

  it('keeps query data when it exists', () => {
    expect(selectOfflineFirstData({
      queryData: ['fresh'],
      fallbackData: ['cached'],
      hasFallbackData: hasArrayData,
    })).toEqual(['fresh'])
  })

  it('can keep a non-empty fallback when a query returns an empty collection', () => {
    expect(selectOfflineFirstData({
      queryData: [],
      fallbackData: ['cached'],
      hasFallbackData: hasArrayData,
      preferFallbackWhenQueryEmpty: true,
    })).toEqual(['cached'])
  })

  it('treats null and undefined as missing values', () => {
    expect(hasValue(null)).toBe(false)
    expect(hasValue(undefined)).toBe(false)
    expect(hasValue({ id: '1' })).toBe(true)
  })
})
