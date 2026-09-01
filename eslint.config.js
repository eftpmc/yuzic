// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

/**
 * Directories held to the design scales.
 *
 * The app had 236 literal font sizes against 21 uses of the type tokens, and
 * 117 literal corner radii — a design system almost nothing called. Rather than
 * rewrite every screen blind, this list is the frontier: a directory joins it
 * once its literals are gone, and the rule then keeps it that way. Adding a
 * directory here should be part of migrating it, never a separate promise.
 *
 * Still to migrate: screens/settings, screens/playing, screens/artist,
 * screens/home, components, screens/album, screens/search, screens/playlist,
 * screens/genre, app.
 */
const SCALED_DIRECTORIES = [
  "src/features/**/*.{ts,tsx}",
  "src/screens/library/**/*.{ts,tsx}",
  "src/screens/genres/**/*.{ts,tsx}",
];

const literalStyleValue = (property, token) => ({
  // Any literal, not just a numeric one: esquery cannot regex-match a number,
  // and a stringly-typed size is no better than a bare one.
  selector: `Property[key.name='${property}'][value.type='Literal']`,
  message: `Use a ${token} token from @/constants/design instead of a literal ${property}. Adding a role there is fine; a one-off number is how the scale drifts.`,
});

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: SCALED_DIRECTORIES,
    rules: {
      "no-restricted-syntax": [
        "error",
        literalStyleValue("fontSize", "typography"),
        literalStyleValue("borderRadius", "radius"),
      ],
    },
  },
]);
