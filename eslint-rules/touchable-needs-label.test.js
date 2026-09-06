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
    // The label is right there, and it says it is a button.
    {
      code: `<Touchable accessibilityRole="button" accessibilityLabel={t('a11y.player.play')}><Play /></Touchable>`,
    },
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
    { code: `<Pressable role="button" aria-label={t('a11y.common.close')}><X /></Pressable>` },
    // A pressable that names itself needs no role: the platform announces a
    // button with text correctly on its own.
    { code: `<Touchable onPress={x}><Text>{t('common.save')}</Text></Touchable>` },
    // The label is a variable, which may well hold a translated string.
    { code: `<Touchable accessibilityRole="button" accessibilityLabel={title}><X /></Touchable>` },
    // The app's own pressables set their role and require their label, so a
    // translated label is all that is left to check.
    { code: `<IconActionButton accessibilityLabel={t('a11y.common.close')} onPress={x} />` },
    { code: `<DetailPlayAction accessibilityLabel={t('common.play')}><Play /></DetailPlayAction>` },
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
    {
      // Named, but never announced as pressable. Eight controls were like this
      // after the a11y pass added labels and stopped there.
      code: `<Touchable accessibilityLabel={t('common.dismiss')}><X /></Touchable>`,
      errors: [{ messageId: 'missingRole', data: { name: 'Touchable' } }],
    },
    {
      // A label that stays English in every locale.
      code: `<Touchable accessibilityRole="button" accessibilityLabel="Close"><X /></Touchable>`,
      errors: [{ messageId: 'hardcodedLabel' }],
    },
    {
      code: `<Touchable accessibilityRole="button" accessibilityLabel={'Close'}><X /></Touchable>`,
      errors: [{ messageId: 'hardcodedLabel' }],
    },
    {
      // A template literal is just as English.
      code: '<Touchable accessibilityRole="button" accessibilityLabel={`Play ${title}`}><X /></Touchable>',
      errors: [{ messageId: 'hardcodedLabel' }],
    },
    {
      // Both faults on one element. Reported in source order, so the element
      // itself comes before the attribute on it.
      code: `<Touchable accessibilityLabel="Close"><X /></Touchable>`,
      errors: [{ messageId: 'missingRole' }, { messageId: 'hardcodedLabel' }],
    },
    {
      // The wrappers are checked for the label's provenance too.
      code: `<IconActionButton accessibilityLabel="Close" onPress={x} />`,
      errors: [{ messageId: 'hardcodedLabel', data: { name: 'IconActionButton' } }],
    },
  ],
});
