// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

/**
 * Sizes and corner radii come from the scales in `constants/design`, everywhere.
 *
 * The app had 236 literal font sizes against 21 uses of the type tokens, and
 * 117 literal corner radii — a design system that existed and that almost
 * nothing called. All of them are migrated; this keeps them that way. The scale
 * file itself is exempt, since that is where the numbers are supposed to live.
 */
const SCALED_FILES = ["src/**/*.{ts,tsx}"];

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
    files: SCALED_FILES,
    ignores: ["src/constants/design.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        literalStyleValue("fontSize", "typography"),
        literalStyleValue("borderRadius", "radius"),
      ],
    },
  },
]);
