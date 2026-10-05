// G01 v2 / T8 + F17: Novo mapa, caminhos até o editor ou até o estado honesto (D-068/D-071/D-088); "Sobre o mapa" no fim (D-500).
import { expect, test } from '@playwright/test';
import { signUpAndLogin } from './visual/fixture';

test.use({ viewport: { width: 1440, height: 900 } });

test('novo mapa: em branco cria e abre o editor com matrixItemIds; PDF, Anki e mapa pronto não fingem gerar', async ({ page, request }) => {
  test.setTimeout(120_000);
  const auth = await signUpAndLogin(page, request);
  const posts: { url: string; body: Record<string, unknown> }[] = [];
  const other: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'POST' || !r.url().includes('/v1/')) return;
    if (r.url().endsWith('/v1/boards')) posts.push({ url: r.url(), body: r.postDataJSON() });
    else other.push(r.url());
  });

  // PDF: CTA só com arquivo. A geração em si é F05 (POST /v1/ai/generate-pdf, não /v1/boards); Anki é F06 (import.spec.ts).
  await page.goto('/app/mapas/novo?caminho=pdf');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  await page.locator('input[type=file]').setInputFiles({ name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') });
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sobre o mapa' })).toBeVisible();
  await expect(page.getByLabel('Nome do mapa')).toHaveValue('a');
  await expect(page.getByRole('button', { name: 'Gerar rascunho do mapa' })).toBeEnabled();
  expect(posts).toEqual([]);

  // Mapa pronto (F10, main): abre direto na lista publicada pela revisão editorial; sem CTA que finja gerar.
  await page.goto('/app/mapas/novo?caminho=pronto');
  await expect(page.getByRole('heading', { level: 1, name: 'Escolha o mapa pronto' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Adicionar ao meu mapa' })).toHaveCount(0);

  // ?caminho= inválido cai em "Em branco"; padrão sem query é PDF.
  await page.goto('/app/mapas/novo?caminho=xyz');
  await expect(page.getByRole('button', { name: /Em branco/ })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/app/mapas/novo');
  await expect(page.getByRole('button', { name: /Do meu PDF/ })).toHaveAttribute('aria-pressed', 'true');

  // ?item= (link da Cobertura): pré-seleciona o item, Em branco, "Sobre o mapa"; id desconhecido é ignorado.
  await page.goto('/app/mapas/novo?item=00000000-0000-0000-0000-000000000000');
  await expect(page.getByRole('heading', { level: 1, name: 'Como você quer começar?' })).toBeVisible();
  const { headers } = auth;
  const list = (await (await request.get('http://localhost:4000/v1/matrix/items?area=CM', { headers })).json()).data as { id: string; title: string; parentId: string | null }[];
  const leaf = list.filter((x) => !list.some((c) => c.parentId === x.id))[1]!;
  await page.goto(`/app/mapas/novo?item=${leaf.id}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Sobre o mapa' })).toBeVisible();
  await expect(page.getByLabel('Nome do mapa')).toHaveCount(1); // the slide keeps the outgoing step mounted for a moment
  await expect(page.getByLabel('Nome do mapa')).toHaveValue(leaf.title);
  await expect(page.getByRole('complementary', { name: 'Prévia do seu mapa' }).getByText(leaf.title).first()).toBeVisible();

  await expect(page.getByRole('button', { name: `Remover ${leaf.title}` })).toBeVisible(); // chip

  // Em branco: cria e vai para o editor com o que está no formulário (o item pré-selecionado acima).
  await page.getByRole('button', { name: 'Criar mapa', exact: true }).click();
  await expect(page).toHaveURL(/\/mapas\/[0-9a-f-]{36}$/);
  expect(posts).toHaveLength(1);
  expect(posts[0]!.body).toEqual({ title: leaf.title, area: 'CM', matrixItemIds: [leaf.id], access: 'owner' });
  expect(other).toEqual([]);
  await expect(page.locator('.react-flow')).toBeVisible();
});
