// F27 T7 (FR-5–FR-9, FR-39, FR-40, FR-45; P-411): editor em blocos no navegador. Blocos, imagem (alt obrigatório), links, autosave + recarga,
// sanitização de HTML colado, aba SEO, publicar bloqueado → publicar, pré-visualização noindex e axe. Admin pela API (padrão de journey.spec).
import { deflateSync } from 'node:zlib';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { accountUser, API, psql } from '../account/fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

const PREFIX = 'E2E Editor F27';
// valid 8x8 PNG (RGB, zlib from node), enough for sharp
function png(): Buffer {
  const crc = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
  const chunk = (type: string, data: Buffer) => { const body = Buffer.concat([Buffer.from(type), data]); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(8, 0); ihdr.writeUInt32BE(8, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.concat(Array.from({ length: 8 }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(24, 160)])));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const PNG = png();
const DESC = 'Descrição do artigo de teste do editor do blog Remoa, com tamanho suficiente para passar na checagem de publicação e aparecer bem no Google.';

test.afterAll(() => psql(`delete from blog_posts where title like '${PREFIX}%'`));

const editorBox = (page: Page) => page.locator('.ProseMirror');
async function block(page: Page, name: string) {
  await page.getByRole('button', { name: 'Adicionar bloco' }).click();
  await page.getByRole('menuitem', { name, exact: true }).click();
}
/** Radix returns focus to the menu trigger and the editor takes it back a tick later: typing before that drops the first characters. */
async function typeInBlock(page: Page, name: string, text: string) {
  await block(page, name);
  await expect(page.locator('.ProseMirror:focus-within')).toBeVisible();
  await page.keyboard.type(text);
}
const axe = async (page: Page) => {
  await page.waitForTimeout(800);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};

test('editor: blocos, imagem com alt, links, autosave, sanitização, aba SEO, publicar e pré-visualizar', async ({ page, request }) => {
  test.setTimeout(Number(process.env.PW_T ?? 240_000));
  const a = await accountUser(page, request, 'Equipe Teste');
  psql(`update profiles set role = 'admin' where user_id = '${a.userId}'`);
  const title = `${PREFIX} ${Date.now()}`;
  const created = await request.post(`${API}/v1/admin/blog/posts`, { headers: a.headers, data: { title, template: 'leitura' } });
  expect(created.status()).toBe(200);
  const post = (await created.json()).data.post as { id: string; slug: string };

  await page.goto(`/admin/blog/${post.id}`);
  await expect(editorBox(page)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title);

  // --- blocos
  await editorBox(page).click();
  await page.keyboard.type('Introdução do artigo de teste do editor.');
  await typeInBlock(page, 'H2 (subtítulo)', 'Primeira seção');
  await typeInBlock(page, 'H3 (subseção)', 'Detalhe da seção');
  await typeInBlock(page, 'Lista', 'Item um');
  await typeInBlock(page, 'Citação', 'Uma citação importante');
  await typeInBlock(page, 'Destaque', 'Texto do destaque');
  await block(page, 'Botão');
  await page.getByLabel('Texto do botão').fill('Começar agora');
  await page.getByLabel('Endereço').first().fill('/cadastro');
  await block(page, 'FAQ');
  await page.getByLabel('Pergunta 1').fill('O que é o Remoa?');
  await page.getByLabel('Resposta').fill('Um mapa de estudo para a residência.');

  // --- imagem: sem alt não insere; com alt entra no texto
  await block(page, 'Imagem');
  const dlg = page.getByRole('dialog', { name: 'Inserir imagem' });
  await dlg.locator('input[type=file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: PNG });
  await expect(dlg.locator('img')).toBeVisible({ timeout: 30_000 });
  await expect(dlg.getByRole('button', { name: 'Inserir' })).toBeDisabled();
  await dlg.getByLabel('Texto alternativo (obrigatório)').fill('Pixel de teste');
  await dlg.getByRole('button', { name: 'Inserir' }).click();
  await expect(editorBox(page).locator('[data-blog-image] input[value="Pixel de teste"]')).toBeVisible();

  // --- links: interno e externo com nofollow
  await block(page, 'Parágrafo');
  await page.getByRole('button', { name: 'Inserir link' }).click();
  let link = page.getByRole('dialog', { name: 'Inserir link' });
  await link.getByLabel('Texto do link').fill('nosso blog');
  await link.getByLabel('Endereço').first().fill('/blog');
  await link.getByRole('button', { name: 'Inserir link' }).click();
  await page.keyboard.type(' e ');
  await page.getByRole('button', { name: 'Inserir link' }).click();
  link = page.getByRole('dialog', { name: 'Inserir link' });
  await link.getByLabel('Texto do link').fill('site externo');
  await link.getByLabel('Endereço').first().fill('https://example.com/ref');
  await link.getByLabel('Não passar autoridade (nofollow)').check();
  await link.getByRole('button', { name: 'Inserir link' }).click();
  await expect(editorBox(page).locator('a[href="/blog"]')).toBeVisible();
  await expect(editorBox(page).locator('a[href="https://example.com/ref"]')).toHaveAttribute('rel', /nofollow/);

  // --- sanitização: HTML colado perde script, onerror e javascript:
  await block(page, 'Parágrafo');
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/html', '<p>Colado seguro</p><script>window.__pwn=1</script><img src="x" onerror="window.__pwn=2"><a href="javascript:window.__pwn=3">clique</a>');
    dt.setData('text/plain', 'Colado seguro');
    document.querySelector('.ProseMirror')!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(editorBox(page)).toContainText('Colado seguro');
  const edHtml = await editorBox(page).innerHTML();
  expect(edHtml).not.toContain('<script');
  expect(edHtml).not.toContain('onerror');
  expect(edHtml).not.toContain('javascript:');

  // --- autosave e recarga
  await expect.poll(() => psql(`select content_json::text from blog_posts where id = '${post.id}'`), { timeout: 30_000 }).toContain('Colado seguro');
  await expect(page.getByText('Salvo agora')).toBeVisible();
  await page.reload();
  await expect(editorBox(page)).toContainText('Primeira seção');
  await expect(editorBox(page)).toContainText('Texto do destaque');
  await expect(editorBox(page).locator('[data-blog-image] input[value="Pixel de teste"]')).toBeVisible();
  await expect(page.getByText('Salvo agora')).toBeVisible();
  expect(await axe(page), 'axe editor').toEqual([]);

  // --- aba SEO
  await page.getByRole('tab', { name: 'SEO' }).click();
  const seoTitle = page.getByLabel('Título para o Google');
  await expect(page.getByText('0/60')).toBeVisible();
  const SEO = 'Como estudar para a residência médica com mapas';
  await seoTitle.fill(SEO);
  await expect(page.getByText(`${SEO.length}/60`)).toBeVisible();
  await expect(page.getByRole('group', { name: 'Como aparece no Google' })).toContainText(SEO);
  const slug = page.getByLabel('Endereço (slug)');
  await slug.fill('Título Com Acento & Espaço');
  await expect(slug).toHaveValue('titulo-com-acento-espaco');
  await expect(page.getByRole('group', { name: 'Como aparece no Google' })).toContainText('titulo-com-acento-espaco');
  const item = (n: string) => page.locator('li[data-state]', { hasText: n });
  const score = page.locator('span.font-extrabold', { hasText: /^\d+\/10$/ });
  const before = await score.innerText();
  await expect(item('Título entre 30 e 60 caracteres')).toHaveAttribute('data-state', /ok/);
  await expect(item('Pelo menos um H2')).toHaveAttribute('data-state', 'ok');
  await expect(item('Descrição entre 120 e 160 caracteres')).not.toHaveAttribute('data-state', 'ok');
  await expect(item('Pelo menos um link interno e um externo')).toHaveAttribute('data-state', 'ok');
  await page.getByRole('tab', { name: 'Publicação' }).click();
  await page.getByLabel('Descrição (aparece no Google e nas redes)').fill(DESC);
  await page.getByRole('tab', { name: 'SEO' }).click();
  await expect(item('Descrição entre 120 e 160 caracteres')).toHaveAttribute('data-state', 'ok');
  expect(await score.innerText()).not.toBe(before);
  expect(await axe(page), 'axe editor SEO').toEqual([]);

  // --- publicar bloqueado (sem capa) mostra o que falta; com capa publica
  const primary = page.getByRole('button', { name: 'Publicar', exact: true });
  await primary.click();
  const confirm = page.getByRole('dialog', { name: 'Publicar este post?' });
  await expect(confirm).toContainText('Falta resolver:');
  await expect(confirm).toContainText('capa com texto alternativo');
  await expect(confirm.getByRole('button', { name: 'Publicar' })).toBeDisabled();
  await confirm.getByRole('button', { name: 'Voltar' }).click();
  await page.getByLabel('Texto alternativo (obrigatório)').first().fill('Capa do artigo de teste');
  await page.locator('input[type=file]').first().setInputFiles({ name: 'capa.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('img', { name: 'Prévia da capa' })).toHaveAttribute('src', /^http/, { timeout: 30_000 });
  await expect(page.getByText('Salvo agora')).toBeVisible({ timeout: 30_000 });

  // --- pré-visualizar: /blog/preview/<token>, noindex
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Pré-visualizar' }).click();
  const pv = await popup;
  await pv.waitForURL(/\/blog\/preview\/[^/]+$/, { timeout: 30_000 });
  await expect(pv.getByRole('heading', { level: 1 })).toContainText(title);
  await expect(pv.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await pv.close();

  await primary.click();
  await expect(confirm).not.toContainText('Falta resolver');
  await confirm.getByRole('button', { name: 'Publicar' }).click();
  await expect(page.getByText('Sitemap atualizado')).toBeVisible({ timeout: 30_000 });

  // --- post publicado: texto presente, nada do HTML colado
  const final = psql(`select slug from blog_posts where id = '${post.id}'`);
  expect(final).toBe('titulo-com-acento-espaco');
  let html = '';
  await expect(async () => {
    const r = await request.get(`/blog/${final}`);
    expect(r.status()).toBe(200);
    html = await r.text();
  }).toPass({ timeout: 30_000 });
  expect(html).toContain('Colado seguro');
  expect(html).not.toContain('__pwn');
  expect(html).not.toContain('onerror');
  expect(html).not.toMatch(/href="javascript:/i);
  expect(html).toMatch(/<a[^>]+href="https:\/\/example\.com\/ref"[^>]*rel="[^"]*nofollow/);
});

test('editor: imagem do conteúdo exige alt (o botão Inserir fica desligado sem ele)', async ({ page, request }) => {
  test.setTimeout(120_000);
  const a = await accountUser(page, request, 'Equipe Teste');
  psql(`update profiles set role = 'admin' where user_id = '${a.userId}'`);
  const created = await request.post(`${API}/v1/admin/blog/posts`, { headers: a.headers, data: { title: `${PREFIX} alt ${Date.now()}`, template: 'leitura' } });
  const post = (await created.json()).data.post as { id: string };
  await page.goto(`/admin/blog/${post.id}`);
  await editorBox(page).click();
  await block(page, 'Imagem');
  const dlg = page.getByRole('dialog', { name: 'Inserir imagem' });
  await expect(dlg.getByRole('button', { name: 'Inserir' })).toBeDisabled();
  await dlg.locator('input[type=file]').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: PNG });
  await expect(dlg.locator('img')).toBeVisible({ timeout: 30_000 });
  await expect(dlg.getByRole('button', { name: 'Inserir' })).toBeDisabled();
  await expect(editorBox(page).locator('[data-blog-image]')).toHaveCount(0);
});
