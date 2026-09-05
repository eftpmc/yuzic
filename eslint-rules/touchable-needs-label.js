/**
 * A pressable that draws no text must say what it is.
 *
 * A screen reader names a button from the text inside it. That covers most of
 * the app — a row, a settings entry, a labelled button all read fine on their
 * own. What it does not cover is the bare glyph: 32 of them were announced as
 * "button" and nothing else, including every transport control on the player.
 *
 * So the rule is not "every pressable carries a label" — that would put a
 * redundant one on 63 controls whose own text already says it, and a label
 * that repeats the text is a second thing to keep in sync. It is: a pressable
 * with no readable text inside it needs a label of its own.
 *
 * Text counts if it is a `<Text>`-ish element, a bare string child, or a `t()`
 * call — a component rendering copy through i18n. A spread (`{...props}`) is
 * assumed to carry a label, since the rule cannot see what is in it.
 */

const DEFAULT_COMPONENTS = ['Touchable', 'Pressable', 'TouchableOpacity'];

/** The name of a JSX element, including `<Animated.Pressable>`-style members. */
function elementName(node) {
  const name = node.name;
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression' && name.property.type === 'JSXIdentifier') {
    return name.property.name;
  }
  return null;
}

function hasLabelAttribute(openingElement) {
  return openingElement.attributes.some(attr => {
    // A spread could hold anything, a label included.
    if (attr.type === 'JSXSpreadAttribute') return true;
    if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') return false;
    return (
      attr.name.name === 'accessibilityLabel' ||
      attr.name.name === 'accessibilityLabelledBy' ||
      attr.name.name === 'aria-label'
    );
  });
}

/** Whether an expression mentions `t(...)`, i.e. renders a translated string. */
function mentionsTranslation(node, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 12) return false;
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    if (callee.type === 'Identifier' && callee.name === 't') return true;
    if (callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 't') return true;
  }
  return Object.keys(node).some(key => {
    if (key === 'parent' || key === 'loc' || key === 'range') return false;
    const child = node[key];
    if (Array.isArray(child)) return child.some(c => mentionsTranslation(c, depth + 1));
    if (child && typeof child.type === 'string') return mentionsTranslation(child, depth + 1);
    return false;
  });
}

/** Whether anything under this element would be read out as text. */
function hasReadableText(children, depth = 0) {
  if (depth > 12) return false;
  return children.some(child => {
    if (child.type === 'JSXText') return child.value.trim().length > 0;

    if (child.type === 'JSXExpressionContainer') {
      const expr = child.expression;
      if (expr.type === 'JSXEmptyExpression') return false;
      if (expr.type === 'Literal') return typeof expr.value === 'string' && expr.value.trim() !== '';
      return mentionsTranslation(expr);
    }

    if (child.type === 'JSXElement') {
      const name = elementName(child.openingElement);
      // `<Text>`, `<ThemedText>`, `<LyricLine>`… anything whose job is copy.
      if (name && /Text$/.test(name)) return true;
      return hasReadableText(child.children, depth + 1);
    }

    if (child.type === 'JSXFragment') return hasReadableText(child.children, depth + 1);

    return false;
  });
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require an accessibilityLabel on a pressable that renders no readable text.',
    },
    schema: [{
      type: 'object',
      properties: {
        components: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    }],
    messages: {
      missingLabel:
        '<{{name}}> draws no text, so a screen reader announces it as an unnamed ' +
        'button. Give it an accessibilityLabel from a t() key (the a11y.* namespace ' +
        'in locales), and an accessibilityRole while you are there.',
    },
  },

  create(context) {
    const configured = context.options[0]?.components;
    const components = new Set(configured ?? DEFAULT_COMPONENTS);

    return {
      JSXElement(node) {
        const name = elementName(node.openingElement);
        if (!name || !components.has(name)) return;
        if (hasLabelAttribute(node.openingElement)) return;
        if (hasReadableText(node.children)) return;

        context.report({
          node: node.openingElement,
          messageId: 'missingLabel',
          data: { name },
        });
      },
    };
  },
};
