import fs from 'fs'
import path from 'path'

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
 */
describe.each(Object.entries(translations))('%s', (_name, translation) => {
  it('translates every key English has', () => {
    const translated = new Set(leafKeys(translation).map(pluralBase))
    const missing = [...new Set(leafKeys(en).map(pluralBase))].filter(
      key => !translated.has(key)
    )
    expect(missing).toEqual([])
  })

  /**
   * And the reverse. A key only the other locales carry is dead weight no user
   * ever sees, so nothing announced it: 38 of them had accumulated in each
   * file — roughly 5% of every translation — including a whole `media.*` block
   * whose English half had never been written, so the code spoke English in
   * every locale while three finished translations sat unused beside it.
   */
  it('carries no key English has dropped', () => {
    const known = new Set(leafKeys(en).map(pluralBase))
    const stale = [...new Set(leafKeys(translation).map(pluralBase))].filter(
      key => !known.has(key)
    )
    expect(stale).toEqual([])
  })
})

const SRC = path.join(__dirname, '..')

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : []
  })
}

/** `t('some.key'` — literal keys only; a computed one can't be checked here. */
const T_CALL = /\bt\(\s*['"]([A-Za-z0-9_.]+\.[A-Za-z0-9_.]+)['"]/g

/**
 * The other direction: a key the code asks for that English does not have.
 *
 * i18next answers a missing key with the key itself, or with whatever
 * `defaultValue` the call site carries — so this fails as a stray
 * `home.displaySheet.title` on screen, or as English inside a Japanese UI that
 * no translator was ever shown. Seven surfaces had drifted that way: the tab
 * bar, the Downloads screen, the display sheet and both Home banners among
 * them. The test above could not see any of it, since it measures the other
 * three locales against English and English was missing them too.
 */
it('has an English string for every key the app asks for', () => {
  const known = new Set(leafKeys(en).map(pluralBase))
  const missing = new Map<string, string>()

  for (const file of sourceFiles(SRC)) {
    const source = fs.readFileSync(file, 'utf8')
    for (const [, key] of source.matchAll(T_CALL)) {
      if (!known.has(pluralBase(key))) {
        missing.set(key, path.relative(SRC, file))
      }
    }
  }

  expect(Object.fromEntries(missing)).toEqual({})
})
