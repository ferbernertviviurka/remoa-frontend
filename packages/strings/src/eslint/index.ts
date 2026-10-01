import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator((name) => `https://remoa.local/eslint/${name}`);

const ATTRS = new Set(['aria-label', 'title', 'placeholder', 'alt', 'label']);
const hasLetters = (s: string) => /\p{L}/u.test(s);

const rule = createRule({
  name: 'no-literal-strings',
  meta: {
    type: 'problem',
    docs: { description: 'Texto visível ao usuário deve vir de @remoa/strings (t()).' },
    messages: { literal: 'Texto literal na UI: use t() de @remoa/strings.' },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const report = (node: TSESTree.Node) => context.report({ node, messageId: 'literal' });
    return {
      JSXText(node) {
        if (hasLetters(node.value)) report(node);
      },
      JSXExpressionContainer(node) {
        const e = node.expression;
        if (node.parent.type === 'JSXAttribute') return; // handled below
        if (e.type === 'Literal' && typeof e.value === 'string' && hasLetters(e.value)) report(e);
        else if (e.type === 'TemplateLiteral' && e.quasis.some((q) => hasLetters(q.value.cooked ?? q.value.raw))) report(e);
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || !ATTRS.has(node.name.name) || !node.value) return;
        const v = node.value;
        if (v.type === 'Literal' && typeof v.value === 'string' && hasLetters(v.value)) report(v);
        else if (v.type === 'JSXExpressionContainer') {
          const e = v.expression;
          if (e.type === 'Literal' && typeof e.value === 'string' && hasLetters(e.value)) report(e);
          else if (e.type === 'TemplateLiteral' && e.quasis.some((q) => hasLetters(q.value.cooked ?? q.value.raw))) report(e);
        }
      },
    };
  },
});

export default { rules: { 'no-literal-strings': rule } };
