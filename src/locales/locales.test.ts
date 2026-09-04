import en from './en.json'
import fr from './fr.json'
import ja from './ja.json'
import zh from './zh.json'

/** Every leaf key, dotted — `library.count.albums_one`, not the objects above it. */
function leafKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key)
  )
}

/**
 * A key without its plural suffix.
 *
 * Languages do not share plural categories — English needs `_one` and `_other`,
 * Japanese and Chinese only ever use `_other` — so a translation is complete
 * when it covers the key, not when it repeats English's categories.
 */
function pluralBase(key: string): string {
  return key.replace(/_(zero|one|two|few|many|other)$/, '')
}

const translations = { fr, ja, zh }

/**
 * A key present in English and missing elsewhere falls back to English at
 * runtime, so a French user gets one English word inside a French sentence.
 * A key the other way round is only dead weight, which is why this checks the
 * one direction — there is a backlog of stale keys and no user sees them.
 */
describe.each(Object.entries(translations))('%s', (_name, translation) => {
  it('translates every key English has', () => {
    const translated = new Set(leafKeys(translation).map(pluralBase))
    const missing = [...new Set(leafKeys(en).map(pluralBase))].filter(
      key => !translated.has(key)
    )
    expect(missing).toEqual([])
  })
})
