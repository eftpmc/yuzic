const { RuleTester } = require('eslint');

const rule = require('./touchable-needs-label');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

// `RuleTester` registers a jest test per case itself, so this is called at the
// top level rather than from inside an `it`.
ruleTester.run('touchable-needs-label', rule, {
  valid: [
    // The label is right there.
    { code: `<Touchable accessibilityLabel={t('a11y.player.play')}><Play /></Touchable>` },
    // Its own text names it, which is what a screen reader reads anyway.
    { code: `<Touchable onPress={x}><Text>Save</Text></Touchable>` },
    { code: `<Touchable onPress={x}><ThemedText>{title}</ThemedText></Touchable>` },
    // Text nested a few levels down still counts.
    { code: `<Touchable><View><View><Text>{name}</Text></View></View></Touchable>` },
    // A component rendering a translated string.
    { code: `<Touchable><Label>{t('common.save')}</Label></Touchable>` },
    { code: `<Touchable>{t('common.cancel')}</Touchable>` },
    // A bare string child.
    { code: `<Touchable>Save</Touchable>` },
    // A spread could carry the label; the rule can't see inside it.
    { code: `<Touchable {...rest}><Icon /></Touchable>` },
    // Not a pressable.
    { code: `<View><Icon /></View>` },
    // aria-label is the web spelling, and still a name.
    { code: `<Pressable aria-label="Close"><X /></Pressable>` },
  ],

  invalid: [
    {
      // The case this whole rule exists for: a transport control.
      code: `<Touchable onPress={skipToNext}><SkipForward size={34} /></Touchable>`,
      errors: [{ messageId: 'missingLabel', data: { name: 'Touchable' } }],
    },
    {
      code: `<Pressable onPress={x}><Icon /></Pressable>`,
      errors: [{ messageId: 'missingLabel' }],
    },
    {
      // A member expression, e.g. Animated.Pressable.
      code: `<Animated.Pressable onPress={x}><Play /></Animated.Pressable>`,
      errors: [{ messageId: 'missingLabel' }],
    },
    {
      // A role says what kind of thing it is, never which one.
      code: `<Touchable accessibilityRole="button"><Ellipsis /></Touchable>`,
      errors: [{ messageId: 'missingLabel' }],
    },
    {
      // Wrapping an icon in views does not make it readable.
      code: `<Touchable><View><Shuffle /></View></Touchable>`,
      errors: [{ messageId: 'missingLabel' }],
    },
    {
      // Two of them, reported separately.
      code: `<View><Touchable><A /></Touchable><Touchable><B /></Touchable></View>`,
      errors: [{ messageId: 'missingLabel' }, { messageId: 'missingLabel' }],
    },
  ],
});
