// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const touchableNeedsLabel = require('./eslint-rules/touchable-needs-label');

/** Rules that are this app's own conventions rather than anyone's preset. */
const yuzic = { rules: { 'touchable-needs-label': touchableNeedsLabel } };

/**
 * Sizes, corner radii and spacing come from `constants/design`, everywhere.
 *
 * The app had 236 literal font sizes against 21 uses of the type tokens, 117
 * literal corner radii and 663 literal paddings — a design system that existed
 * and that almost nothing called. All of them are migrated; this keeps them that
 * way. The scale file itself is exempt, since that is where the numbers live.
 */
const SCALED_FILES = ["src/**/*.{ts,tsx}"];

const literalStyleValue = (property, token) => ({
  // Any literal, not just a numeric one: esquery cannot regex-match a number,
  // and a stringly-typed size is no better than a bare one.
  selector: `Property[key.name='${property}'][value.type='Literal']`,
  message: `Use a ${token} token from @/constants/design instead of a literal ${property}. Adding a role there is fine; a one-off number is how the scale drifts.`,
});

/** Zero is the absence of spacing rather than an amount of it, so it stays a
 * literal — `padding: 0` is clearer than any token could be. */
const literalSpacing = (property) => ({
  selector: `Property[key.name='${property}'][value.type='Literal'][value.value!=0]`,
  message: `Use a spacing token from @/constants/design instead of a literal ${property}. Adding a step there is fine; a one-off number is how the scale drifts.`,
});

const SPACING_PROPERTIES = ['padding', 'margin'].flatMap(base => [
  base,
  ...['Horizontal', 'Vertical', 'Top', 'Bottom', 'Left', 'Right', 'Start', 'End']
    .map(side => base + side),
]);

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: SCALED_FILES,
    // The scale file is where the numbers live, and its test has to write a
    // fixture scale to check the scaling with.
    ignores: ["src/constants/design.ts", "src/constants/design.test.ts"],
    plugins: { yuzic },
    rules: {
      "no-restricted-syntax": [
        "error",
        literalStyleValue("fontSize", "typography"),
        literalStyleValue("borderRadius", "radius"),
        ...SPACING_PROPERTIES.map(literalSpacing),
        // `components/Touchable` is the app's one answer to a press. A second
        // one drifts back the moment it is importable — a `TouchableOpacity`
        // had already reappeared in the server settings after the sweep that
        // removed every other use of it.
        {
          selector:
            "ImportDeclaration[source.value='react-native'] > ImportSpecifier[imported.name='TouchableOpacity']",
          message:
            "Use components/Touchable instead of TouchableOpacity. It gives Android a bounded ripple and every other platform an opacity dip, from one file so the two can't drift apart per screen.",
        },
      ],
      // A bare glyph says nothing to a screen reader unless it is told to.
      "yuzic/touchable-needs-label": "error",
    },
  },
]);
