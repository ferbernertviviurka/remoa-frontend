// F27 T11: jornada do blog (admin cria por template, publica, vê em /blog, na Landing e no sitemap; despublica e some; slug novo → 301) e aceite legal no cadastro.
// Admin pela API (padrão de e2e/blog/admin-list.spec.ts); E2E_KEEP=1 mantém os posts (seo:check precisa de 1 por template).
import { expect, test, type APIRequestContext } from '@playwright/test';
import { accountUser, API, psql } from '../account/fixture';
import { formReady, skipOnboarding } from '../sign-up';

const TEMPLATES = ['leitura', 'guia', 'destaque'] as const;
const PREFIX = 'E2E Jornada F27';
const DESC = 'Descrição do artigo de teste do blog Remoa, com tamanho suficiente para passar na checagem de publicação e aparecer bem no Google.';
const DOC = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Introdução curta ao tema do artigo de teste.' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Primeira seção' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Texto da primeira seção com informação útil para o estudo.' }] },
    { type: 'faq', attrs: { items: [{ q: 'Pergunta de teste?', a: 'Resposta de teste.' }] } },
  ],
};

test.afterAll(() => {
  if (!process.env.E2E_KEEP) psql(`delete from blog_posts where title like '${PREFIX}%'`);
});

async function adminHeaders(page: Parameters<typeof accountUser>[0], request: APIRequestContext) {
  const a = await accountUser(page, request, 'Equipe Teste');
  psql(`update profiles set role = 'admin' where user_id = '${a.userId}'`);
  return a.headers;
}

for (const template of TEMPLATES) {
  test(`blog ${template}: publica, aparece em /blog, na Landing e no sitemap; despublica e sai`, async ({ page, request }) => {
    test.setTimeout(120_000);
    const headers = await adminHeaders(page, request);
    const adm = `${API}/v1/admin/blog`;
    const title = `${PREFIX} ${template} ${Date.now()}`;
    const created = await request.post(`${adm}/posts`, { headers, data: { title, template } });
    expect(created.status()).toBe(200);
    const post = (await created.json()).data.post as { id: string; slug: string };

    // publicar bloqueia sem capa, descrição e H2
    const blocked = await request.post(`${adm}/posts/${post.id}/publish`, { headers });
    expect(blocked.ok()).toBe(false);

    const asset = psql(`insert into blog_assets (key, width, height, mime, size) values ('blog/e2e-${post.id}.webp', 1200, 630, 'image/webp', 100) returning id`).split('\n')[0]!;
    const patch = await request.patch(`${adm}/posts/${post.id}`, {
      headers,
      data: { description: DESC, coverAssetId: asset, coverAlt: 'Capa do artigo', content: DOC },
    });
    expect(patch.status()).toBe(200);
    expect((await request.post(`${adm}/posts/${post.id}/publish`, { headers })).status()).toBe(200);

    await expect(async () => {
      await page.goto('/blog');
      await expect(page.getByRole('link', { name: new RegExp(title) }).first()).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    expect((await page.goto(`/blog/${post.slug}`))?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

    await expect(async () => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Aprenda a estudar melhor' })).toBeVisible({ timeout: 2_000 });
      await expect(page.getByRole('link', { name: 'Ver mais artigos' }).first()).toBeVisible({ timeout: 2_000 });
      await expect(page.locator(`a[href="/blog/${post.slug}"]`).first()).toBeAttached({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });

    const sitemap = async () => (await request.get('/sitemap.xml')).text();
    await expect.poll(sitemap, { timeout: 30_000 }).toContain(`/blog/${post.slug}`);

    if (process.env.E2E_KEEP) return; // deixa publicado para o seo:check

    // despublicar exige motivo (≥ 8) e tira de tudo
    expect((await request.post(`${adm}/posts/${post.id}/unpublish`, { headers, data: { reason: 'curto' } })).ok()).toBe(false);
    expect((await request.post(`${adm}/posts/${post.id}/unpublish`, { headers, data: { reason: 'Teste e2e de despublicação' } })).status()).toBe(200);
    await expect.poll(sitemap, { timeout: 30_000 }).not.toContain(`/blog/${post.slug}`);
    await expect(async () => {
      await page.goto('/blog');
      await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveCount(0, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await expect(async () => {
      await page.goto('/');
      await expect(page.locator(`a[href="/blog/${post.slug}"]`)).toHaveCount(0, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await expect.poll(async () => (await page.goto(`/blog/${post.slug}`))?.status(), { timeout: 30_000 }).toBe(404);
  });
}

test('mudar o slug de um post publicado cria 301 do antigo para o novo', async ({ page, request }) => {
  test.setTimeout(120_000);
  const headers = await adminHeaders(page, request);
  const adm = `${API}/v1/admin/blog`;
  const created = await request.post(`${adm}/posts`, { headers, data: { title: `${PREFIX} slug ${Date.now()}`, template: 'leitura' } });
  const post = (await created.json()).data.post as { id: string; slug: string };
  const asset = psql(`insert into blog_assets (key, width, height, mime, size) values ('blog/e2e-${post.id}.webp', 1200, 630, 'image/webp', 100) returning id`).split('\n')[0]!;
  await request.patch(`${adm}/posts/${post.id}`, { headers, data: { description: DESC, coverAssetId: asset, coverAlt: 'Capa', content: DOC } });
  expect((await request.post(`${adm}/posts/${post.id}/publish`, { headers })).status()).toBe(200);
  const next = `e2e-novo-${Date.now()}`;
  expect((await request.patch(`${adm}/posts/${post.id}`, { headers, data: { slug: next } })).status()).toBe(200);
  await expect(async () => {
    const r = await request.get(`/blog/${post.slug}`, { maxRedirects: 0 });
    expect([301, 308]).toContain(r.status());
    expect(r.headers().location).toContain(`/blog/${next}`);
  }).toPass({ timeout: 30_000 });
  expect((await request.get(`/blog/${next}`)).status()).toBe(200);
});

test('cadastro registra o aceite dos termos e da política (versão e data)', async ({ page }) => {
  test.setTimeout(120_000);
  const email = `e2e-legal-${Date.now()}@remoa.test`;
  await page.goto('/cadastro');
  await formReady(page);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('link', { name: /Termos de uso/i }).first()).toHaveAttribute('href', '/termos-de-uso');
  await expect(page.getByRole('link', { name: /Política de Privacidade/i }).first()).toHaveAttribute('href', '/politica-de-privacidade');
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await skipOnboarding(page);
  const uid = psql(`select id from auth.users where email = '${email}'`);
  const rows = psql(`select document || ':' || version || ':' || accepted_at::text from legal_acceptances where user_id = '${uid}' order by document`);
  expect(rows.split('\n')).toHaveLength(2);
  expect(rows).toMatch(/privacy:\S+:\d{4}-\d{2}-\d{2}/);
  expect(rows).toMatch(/terms:\S+:\d{4}-\d{2}-\d{2}/);
  const p = psql(`select terms_accepted_version || '|' || privacy_accepted_version || '|' || accepted_at is not null from profiles where user_id = '${uid}'`);
  expect(p).not.toContain('null');
});
