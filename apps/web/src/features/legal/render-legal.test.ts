import { describe, expect, it } from 'vitest';
import { renderLegal } from './render-legal';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const vars = { razaoSocial: 'Acme <b>', cnpj: '', versao: '1' };
const md = `<!-- hidden -->
# Titulo

_Versão {{versao}}_

Intro {{razaoSocial}}.

## 1. Quem somos

Texto **forte** e _leve_ com [link](https://x.com/a?b=1&c=2) e [mau](javascript:alert(1)). CNPJ {{cnpj}}. Idade [CONFIRMAR]. <script>x</script>

- item um
- item **dois**

### Sub
`;

describe('renderLegal', () => {
  it('renders the subset and escapes everything', () => {
    const d = renderLegal(md, { vars, production: false });
    expect(d.title).toBe('Titulo');
    expect(d.lead).toBe('Intro Acme <b>.'); // plain text; the component renders it as a text node
    expect(d.sections).toHaveLength(1);
    const { id, title, html } = d.sections[0]!;
    expect([id, title]).toEqual(['quem-somos', 'Quem somos']);
    expect(html).toContain('<strong>forte</strong>');
    expect(html).toContain('<em>leve</em>');
    expect(html).toContain('<a href="https://x.com/a?b=1&amp;c=2">link</a>');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('<ul><li>item um</li><li>item <strong>dois</strong></li></ul>');
    expect(html).toContain('<h3>Sub</h3>');
    expect(html).not.toContain('hidden');
  });
  it('escapes variable values', () => {
    expect(renderLegal('## A\n\n{{razaoSocial}}', { vars, production: false }).sections[0]!.html).toBe('<p>Acme &lt;b&gt;</p>');
  });
  it('marks pending items outside production only', () => {
    const dev = renderLegal(md, { vars, production: false });
    expect(dev.pending).toBe(true);
    expect(dev.sections[0]!.html).toContain('<mark class="rb-pending">{{cnpj}}</mark>');
    expect(dev.sections[0]!.html).toContain('<mark class="rb-pending">[CONFIRMAR]</mark>');
    const prod = renderLegal(md, { vars, production: true });
    expect(prod.sections[0]!.html).not.toContain('<mark');
    expect(prod.sections[0]!.html).not.toContain('{{cnpj}}');
  });
});

describe('content/legal (P-434)', () => {
  const dir = join(__dirname, '..', '..', '..', 'content', 'legal');
  it('no literal e-mail; only known {{vars}}; dpoEmail renders', async () => {
    const { LEGAL_TEMPLATE_ENV } = await import('@/lib/env/legal');
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      const src = readFileSync(join(dir, f), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
      expect(src, f).not.toMatch(/[\w.-]+@[\w-]+\.\w+/);
      for (const [, k] of src.matchAll(/\{\{(\w+)\}\}/g)) expect(k === 'versao' || k! in LEGAL_TEMPLATE_ENV, `${f}: ${k}`).toBe(true);
    }
    const out = renderLegal('# T\n\n## 1. A\n\nEscreva para {{dpoEmail}}.', { vars: { dpoEmail: 'dpo@x.com' }, production: true });
    expect(out.sections[0]!.html).toContain('dpo@x.com');
  });
});
