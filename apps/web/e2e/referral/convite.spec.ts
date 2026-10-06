// F18 T7 (FR-14, FR-15, FR-16, FR-25): página do convite, cookie rf, atribuição, "já tem conta", autoindicação, axe.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signUpViaForm } from '../sign-up';
import { API, createInviter, fillSignUp, friendsOf, openInvite, rfCookie } from './fixture';

const axe = async (page: Page) => {
  await page.waitForTimeout(1500); // axe lê opacidade no meio das transições (rise 900 ms, anel 900 ms)
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};

test('válido: mostra quem convidou, grava rf (httpOnly, 30 dias) e é noindex', async ({ page, request }) => {
  const { code } = await createInviter(request);
  await openInvite(page, code.toLowerCase());
  await expect(page.getByText('Ana convidou você para o Remoa')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ganhe 1 mês de Pro ao criar seu primeiro mapa.');
  await expect(page.getByText('Ana também ganha 1 mês de Pro quando você criar o primeiro mapa.')).toBeVisible();
  await expect(page.getByText('Seu nome aparece para quem convidou você')).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);
  await expect.poll(() => rfCookie(page)).toMatchObject({ value: code, httpOnly: true, sameSite: 'Lax' });
  expect(((await rfCookie(page))!.expires - Date.now() / 1000) / 86_400).toBeGreaterThan(29);
  expect(await axe(page)).toEqual([]);
});

test('inválido: versão neutra, sem promessa e sem cookie', async ({ page }) => {
  await openInvite(page, 'ZZZZZZZZ');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Crie seu primeiro mapa de estudo.');
  await expect(page.getByText(/ganha 1 mês/)).toHaveCount(0);
  await expect(page.getByText(/Seu nome aparece/)).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(await rfCookie(page)).toBeUndefined();
  expect(await axe(page)).toEqual([]);
});

test('logado: "Você já tem conta" leva ao app e não grava rf', async ({ page, request }) => {
  const { code } = await createInviter(request);
  await signUpViaForm(page, `e2e-logado-${Date.now()}@remoa.test`);
  await expect(page).toHaveURL(/\/app\/hoje$/);
  await page.goto(`/i/${code}`);
  await expect(page.getByText('Você já tem conta')).toBeVisible();
  await page.waitForTimeout(500);
  expect(await rfCookie(page)).toBeUndefined();
  await page.getByRole('link', { name: 'Ir para o app' }).click();
  await expect(page).toHaveURL(/\/app\/hoje$/);
});

test('cadastro por e-mail com código: atribui (indicador vê o amigo), apaga rf e leva ao primeiro mapa', async ({ page, request }) => {
  const inviter = await createInviter(request);
  await openInvite(page, inviter.code);
  await expect.poll(() => rfCookie(page)).toBeTruthy();
  await fillSignUp(page, `e2e-indicado-${Date.now()}@remoa.test`);
  await expect(page.getByRole('heading', { name: 'Conta criada.' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Criar a conta' })).toContainText('concluído');
  await expect.poll(async () => (await friendsOf(request, inviter.headers)).map((f) => f.status)).toEqual(['signed_up']);
  expect(await rfCookie(page)).toBeUndefined();
  expect(await axe(page)).toEqual([]);
  await page.getByRole('link', { name: /Criar meu primeiro mapa/ }).click();
  await expect(page).toHaveURL(/\/app\/mapas\/novo/);
});

test('autoindicação: o próprio código nunca atribui', async ({ request }) => {
  const inviter = await createInviter(request);
  const r = await request.post(`${API}/v1/referral/attribution`, { headers: inviter.headers, data: { code: inviter.code } });
  expect((await r.json()).data).toEqual({ attributed: false });
  expect(await friendsOf(request, inviter.headers)).toEqual([]);
});

test('/regulamento-indicacao: pública, marcada como versão preliminar e linkada no rodapé do convite', async ({ page }) => {
  await openInvite(page, 'ZZZZZZZZ');
  // o indicador do overlay de dev do Next fica sobre o canto inferior esquerdo e intercepta o clique: confere o href e navega
  await expect(page.getByRole('link', { name: 'Regulamento do programa' })).toHaveAttribute('href', '/regulamento-indicacao');
  await page.goto('/regulamento-indicacao');
  await expect(page.getByText('Versão preliminar')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Regulamento');
  expect(await axe(page)).toEqual([]);
});
