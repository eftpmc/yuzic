/**
 * Fisher-Yates shuffle driven by a seed instead of Math.random, so the same
 * seed always gives the same order.
 *
 * Used where a list should look shuffled but stay put between renders — a
 * recommendation row that reshuffled on every re-render would move under the
 * user's finger.
 */
export default function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let state = (seed * 2 ** 31) | 0;
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Numerical Recipes' linear congruential generator.
    state = Math.imul(state, 1664525) + 1013904223;
    const j = Math.abs(state) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
