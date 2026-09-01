import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Guards the Maestro E2E flows against silent rot.
 *
 * The flows drive a real build on a device, so nothing in CI runs them — a
 * renamed testID breaks them invisibly until someone runs Maestro by hand.
 * This can't verify the flows pass, only that every element they reach for
 * still exists in the source, which is the failure that actually happens.
 */

const ROOT = path.resolve(__dirname, '..');
const FLOW_DIR = __dirname;

function flowFiles(): string[] {
  return fs
    .readdirSync(FLOW_DIR)
    .filter(name => name.endsWith('.yaml'))
    .map(name => path.join(FLOW_DIR, name));
}

/** testIDs the flows reference, as `id: "..."` selectors. */
function referencedIds(): Map<string, string[]> {
  const byId = new Map<string, string[]>();
  for (const file of flowFiles()) {
    const contents = fs.readFileSync(file, 'utf8');
    for (const match of contents.matchAll(/\bid:\s*"([^"]+)"/g)) {
      const id = match[1];
      byId.set(id, [...(byId.get(id) ?? []), path.basename(file)]);
    }
  }
  return byId;
}

function sourceText(): string {
  // git grep keeps this to tracked source and off node_modules.
  return execFileSync('git', ['grep', '-h', '-E', 'testID=', '--', 'src'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

/**
 * The text of every testID assignment: the quoted string of `testID="x"`, or
 * the whole braced expression of `testID={...}`, found by brace depth so a
 * `${}` inside a template literal doesn't end it early.
 */
function testIdExpressions(source: string): string[] {
  const expressions: string[] = [];
  const marker = 'testID=';

  for (let i = source.indexOf(marker); i !== -1; i = source.indexOf(marker, i + 1)) {
    const start = i + marker.length;
    if (source[start] === '"') {
      const end = source.indexOf('"', start + 1);
      if (end !== -1) expressions.push(source.slice(start, end + 1));
      continue;
    }
    if (source[start] !== '{') continue;

    let depth = 0;
    for (let j = start; j < source.length; j++) {
      if (source[j] === '{') depth += 1;
      else if (source[j] === '}') {
        depth -= 1;
        if (depth === 0) {
          expressions.push(source.slice(start + 1, j));
          break;
        }
      }
    }
  }
  return expressions;
}

/**
 * Every id an assignment can produce. A conditional yields more than one
 * (`testID={x ? 'a' : 'b'}`), so each branch counts.
 */
function literalTestIds(source: string): Set<string> {
  const ids = new Set<string>();
  for (const expression of testIdExpressions(source)) {
    for (const match of expression.matchAll(/['"`]([^'"`${]+)['"`]/g)) {
      ids.add(match[1]);
    }
  }
  return ids;
}

/**
 * Prefixes of interpolated testIDs: testID={`library-filter-${value}`} yields
 * "library-filter-". A referenced id starting with one of these is assumed
 * built at runtime; the interpolated half can't be checked from here.
 */
function templatePrefixes(source: string): string[] {
  const prefixes: string[] = [];
  for (const expression of testIdExpressions(source)) {
    for (const match of expression.matchAll(/`([^`$]*)\$\{/g)) {
      if (match[1]) prefixes.push(match[1]);
    }
  }
  return prefixes;
}

describe('Maestro flows', () => {
  const source = sourceText();
  const literals = literalTestIds(source);
  const prefixes = templatePrefixes(source);
  const referenced = referencedIds();

  it('reads the flow files', () => {
    expect(flowFiles().length).toBeGreaterThan(0);
    expect(referenced.size).toBeGreaterThan(0);
  });

  it('finds testIDs declared in the source', () => {
    // Guards the extraction itself: a regex that matched nothing would make
    // the check below vacuously pass.
    expect(literals.size).toBeGreaterThan(0);
  });

  it('only reaches for elements that exist in the source', () => {
    const missing = [...referenced.entries()]
      .filter(([id]) => !literals.has(id) && !prefixes.some(prefix => id.startsWith(prefix)))
      .map(([id, files]) => `${id} (referenced by ${files.join(', ')})`);

    expect(missing).toEqual([]);
  });
});
