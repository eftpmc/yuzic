import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The discovery step (E4) must be registered in the onboarding Stack and
 * wired to fire exactly once, after a server/local library is connected —
 * never as a route reachable from outside `(onboarding)`. This is checked
 * at the source level rather than by rendering the full navigator stack,
 * which needs a real expo-router runtime.
 */
describe('onboarding flow registration — discovery step', () => {
  const layoutSrc = readFileSync(
    join(__dirname, '../../../app/(onboarding)/_layout.tsx'),
    'utf8'
  );

  it('registers the discovery screen in the onboarding stack', () => {
    expect(layoutSrc).toMatch(/name="discovery"/);
  });

  it('places discovery after every server-connect exit point (libraries, local, connect demo, servers list)', () => {
    const librariesSrc = readFileSync(join(__dirname, '../libraries/index.tsx'), 'utf8');
    const localSrc = readFileSync(join(__dirname, '../local/index.tsx'), 'utf8');
    const connectSrc = readFileSync(join(__dirname, '../connect/index.tsx'), 'utf8');
    const serversSrc = readFileSync(join(__dirname, '../servers/index.tsx'), 'utf8');

    for (const src of [librariesSrc, localSrc, connectSrc, serversSrc]) {
      expect(src).toMatch(/\(onboarding\)\/discovery/);
      expect(src).toMatch(/selectOnboardingDiscoveryPrompted/);
    }
  });

  it('never routes to discovery from outside the onboarding stack', () => {
    // Grep the whole app/ router tree (excluding onboarding itself) for any
    // reference to the discovery route — it must only ever be reached from
    // within `(onboarding)`, never as a global post-onboarding modal.
    const appDir = join(__dirname, '../../../app');
    const glob: (dir: string) => string[] = (dir) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- test-only helper
      const fs = require('fs');
      let files: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) files = files.concat(glob(full));
        else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) files.push(full);
      }
      return files;
    };

    const outsideOnboarding = glob(appDir).filter((f) => !f.includes(`${join('app', '(onboarding)')}`));
    for (const file of outsideOnboarding) {
      const content = readFileSync(file, 'utf8');
      expect(content).not.toMatch(/\(onboarding\)\/discovery/);
    }
  });
});
