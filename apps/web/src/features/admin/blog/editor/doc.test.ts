import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import type { BlogDoc } from '@remoa/contracts';
import { blogExtensions } from './extensions';
import { checklistView, fromBrasiliaInput, moveBlock, parseDoc, removeBlock, toBrasiliaInput } from './doc';
import { typingSlug } from './post-editor';

const txt = (text: string, marks?: unknown[]) => (marks ? { type: 'text', text, marks } : { type: 'text', text });
const p = (...c: unknown[]) => ({ type: 'paragraph', content: c });

/** Every node and mark the contract allows, in the exact shape the editor emits. */
const rich = {
  type: 'doc',
  content: [
    p(txt('Abertura com '), txt('negrito', [{ type: 'bold' }]), txt(' e '), txt('itálico', [{ type: 'italic' }])),
    { type: 'heading', attrs: { level: 2 }, content: [txt('Seção')] },
    { type: 'heading', attrs: { level: 3 }, content: [txt('Subseção')] },
    { type: 'heading', attrs: { level: 4 }, content: [txt('Detalhe')] },
    p(txt('interno', [{ type: 'link', attrs: { href: '/blog/outro', rel: null } }]), txt(' e '), txt('externo', [{ type: 'link', attrs: { href: 'https://example.com', rel: 'nofollow' } }, { type: 'bold' }])),
    { type: 'bulletList', content: [{ type: 'listItem', content: [p(txt('um')), { type: 'orderedList', attrs: { start: 1 }, content: [{ type: 'listItem', content: [p(txt('aninhado'))] }] }] }] },
    { type: 'orderedList', attrs: { start: 3 }, content: [{ type: 'listItem', content: [p(txt('três'))] }] },
    { type: 'blockquote', content: [p(txt('citação'))] },
    { type: 'callout', attrs: { variant: 'atencao' }, content: [p(txt('cuidado'))] },
    { type: 'image', attrs: { assetId: '00000000-0000-4000-8000-000000009201', src: null, alt: 'Mapa de estudo', caption: 'Legenda', width: 1200, height: 630 } },
    { type: 'button', attrs: { text: 'Criar meu mapa', href: '/#cta' } },
    { type: 'faq', attrs: { items: [{ q: 'Pergunta?', a: 'Resposta.' }] } },
    { type: 'paragraph' },
  ],
} as unknown as BlogDoc;

let editor: Editor | null = null;
const make = (content: unknown) => (editor = new Editor({ extensions: blogExtensions(), content: content as string }));
afterEach(() => { editor?.destroy(); editor = null; });

describe('editor JSON vs contract (D-909)', () => {
  it('round-trips every allowed block through blogDocSchema without losing anything', () => {
    const json = make(rich).getJSON();
    const doc = parseDoc(json);
    expect(doc).toEqual(rich);
  });

  it('drops what the schema forbids (H1, code, hr, strike, underline, raw img, script, tables)', () => {
    const json = make(
      '<h1>Título solto</h1><pre><code>x = 1</code></pre><hr><p><s>riscado</s> <u>sublinhado</u> <code>code</code> ok</p>'
      + '<img src="https://x.com/a.png" alt="a"><script>alert(1)</script><table><tr><td>célula</td></tr></table><h5>h5</h5>',
    ).getJSON();
    const types = new Set<string>();
    const walk = (n: { type?: string; content?: unknown[]; marks?: { type: string }[] }) => {
      if (n.type) types.add(n.type);
      n.marks?.forEach((m) => types.add(m.type));
      (n.content as typeof n[] | undefined)?.forEach(walk);
    };
    walk(json);
    for (const bad of ['codeBlock', 'code', 'horizontalRule', 'strike', 'underline', 'table', 'hardBreak']) expect(types).not.toContain(bad);
    expect(JSON.stringify(json)).not.toContain('"level":1');
    expect(types).not.toContain('image');
    expect(parseDoc(json)).not.toBeNull();
  });

  it('keeps only nofollow/sponsored rels and refuses unsafe hrefs on paste', () => {
    const json = JSON.stringify(make('<p><a href="https://a.com" rel="noopener noreferrer nofollow">a</a> <a href="https://b.com" rel="sponsored noopener">b</a> <a href="javascript:alert(1)">c</a> <a href="https://d.com" rel="noopener">d</a></p>').getJSON());
    expect(json).toContain('"rel":"nofollow"');
    expect(json).toContain('"rel":"sponsored"');
    expect(json).not.toContain('noopener');
    expect(json).not.toContain('javascript');
    expect(parseDoc(JSON.parse(json))).not.toBeNull();
  });

  it('an image without alt or an empty FAQ keeps the doc invalid (not saved)', () => {
    expect(parseDoc(make({ type: 'doc', content: [{ type: 'image', attrs: { assetId: '00000000-0000-4000-8000-000000009201', alt: '', width: 10, height: 10 } }] }).getJSON())).toBeNull();
    editor?.destroy();
    expect(parseDoc(make({ type: 'doc', content: [{ type: 'faq', attrs: { items: [{ q: '', a: '' }] } }] }).getJSON())).toBeNull();
  });
});

describe('block moves', () => {
  const three = { type: 'doc', content: [p(txt('A')), p(txt('B')), p(txt('C'))] };
  const order = (e: Editor) => e.getJSON().content?.map((n) => (n.content?.[0] as { text?: string } | undefined)?.text).join('');

  it('moves the current block up and down and stops at the edges', () => {
    const e = make(three);
    e.commands.setTextSelection(4); // inside "B"
    expect(moveBlock(e, -1)).toBe(true);
    expect(order(e)).toBe('BAC');
    expect(moveBlock(e, -1)).toBe(false);
    expect(moveBlock(e, 1)).toBe(true);
    expect(moveBlock(e, 1)).toBe(true);
    expect(order(e)).toBe('ACB');
    expect(moveBlock(e, 1)).toBe(false);
  });

  it('removes the current block', () => {
    const e = make(three);
    e.commands.setTextSelection(4);
    removeBlock(e);
    expect(order(e)).toBe('AC');
  });
});

describe('helpers', () => {
  it('Brasília time round-trips through datetime-local', () => {
    expect(fromBrasiliaInput('2026-10-08T09:00')).toBe('2026-10-08T12:00:00.000Z');
    expect(toBrasiliaInput('2026-10-08T12:00:00.000Z')).toBe('2026-10-08T09:00');
    expect(fromBrasiliaInput('')).toBeNull();
  });

  it('typingSlug lets a hyphen be typed but never accents or spaces', () => {
    expect(typingSlug('Repetição ')).toBe('repeticao-');
    expect(typingSlug('repeticao-esp')).toBe('repeticao-esp');
    expect(typingSlug('')).toBe('');
  });

  it('checklist reacts to the content (H2, links, images)', () => {
    const base = { title: 'Título com mais de trinta caracteres ok', description: 'x'.repeat(130), slug: 'titulo', coverAssetId: 'c', coverAlt: 'alt', content: { type: 'doc', content: [] } as BlogDoc };
    const before = checklistView(base);
    expect(before.items.find((i) => i.id === 'h2')?.state).toBe('error');
    const after = checklistView({ ...base, content: rich });
    expect(after.items.find((i) => i.id === 'h2')?.state).toBe('ok');
    expect(after.items.find((i) => i.id === 'links')?.hint).toBe('2 internos · 1 externos');
    expect(after.score).toBeGreaterThan(before.score);
  });
});
