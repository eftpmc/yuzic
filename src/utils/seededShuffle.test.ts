import seededShuffle from './seededShuffle';

const input = [1, 2, 3, 4, 5, 6, 7, 8];

describe('seededShuffle', () => {
  it('returns a permutation of the input', () => {
    expect(seededShuffle(input, 7).sort((a, b) => a - b)).toEqual(input);
  });

  it('does not mutate the input', () => {
    seededShuffle(input, 7);

    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('gives the same order for the same seed', () => {
    // This is the whole point: a recommendation row that reshuffled on every
    // re-render would move under the user's finger.
    expect(seededShuffle(input, 42)).toEqual(seededShuffle(input, 42));
  });

  it('gives a different order for a different seed', () => {
    expect(seededShuffle(input, 1)).not.toEqual(seededShuffle(input, 2));
  });

  it('reorders rather than returning the input untouched', () => {
    expect(seededShuffle(input, 3)).not.toEqual(input);
  });

  it('handles empty and single-element arrays', () => {
    expect(seededShuffle([], 1)).toEqual([]);
    expect(seededShuffle([1], 1)).toEqual([1]);
  });

  it('accepts a zero seed', () => {
    expect(seededShuffle(input, 0).sort((a, b) => a - b)).toEqual(input);
  });

  it('accepts a negative seed', () => {
    expect(seededShuffle(input, -5).sort((a, b) => a - b)).toEqual(input);
  });
});
