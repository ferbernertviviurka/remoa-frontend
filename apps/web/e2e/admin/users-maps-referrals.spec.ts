// F19 FR-14, FR-15, FR-17, FR-20: the admin grants Pro, suspends, opens a user's map in audit mode (with a reason); axe on each page.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { accountUser, API, psql } from '../account/fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

const axe = async (page: Page) => {
  await page.waitForTimeout(1000); // slide/pop animations
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
};

async function confirm(page: Page, reason: string) {
  const dialog = page.getByRole('alertdialog');
  await dialog.getByLabel('Motivo (obrigatório)').fill('curto');
  await dialog.getByRole('button', { name: /^(Conceder|Suspender|Abrir)$/ }).click();
  await expect(dialog.getByRole('alert')).toContainText('pelo menos 8 caracteres'); // blocked, nothing sent
  await dialog.getByLabel('Motivo (obrigatório)').fill(reason);
  await dialog.getByRole('button', { name: /^(Conceder|Suspender|Abrir)$/ }).click();
  await expect(dialog.getByRole('status')).toContainText(/Ação registrada na auditoria \(a_\d+\)/);
  await dialog.getByRole('button', { name: 'Concluir' }).click();
}

test('admin grants Pro, suspends, opens a map read-only; the audit trail shows each action; axe clean', async ({ page, request, browser }) => {
  test.setTimeout(180_000);
  const admin = await accountUser(page, request, 'Equipe Teste');
  psql(`update profiles set role = 'admin' where user_id = '${admin.userId}'`);
  const probe = await request.get(`${API}/v1/admin/users`, { headers: admin.headers });
  test.skip(probe.status() !== 200, 'backend T5 (/v1/admin/users) not available');

  // the person being managed, with a map that has one card
  const ctx = await browser.newContext();
  const target = await accountUser(await ctx.newPage(), request, 'Paciente Zero');
  const title = `Sepse auditável ${Date.now()}`;
  const created = await request.post(`${API}/v1/boards`, { headers: target.headers, data: { title } });
  const board = (await created.json()).data.id as string;
  await request.post(`${API}/v1/boards/ops`, { headers: target.headers, data: { ops: [{ op: 'createCard', opId: crypto.randomUUID(), boardId: board, card: { id: crypto.randomUUID(), type: 'concept', title: 'Lactato', position: { x: 0, y: 0 } } }] } });

  // --- users: search is a URL param; drawer; reason rule; action; audit entry
  await page.goto('/admin/usuarios');
  await expect(page.getByRole('heading', { level: 1, name: 'Usuários' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Buscar' }).fill(target.email);
  await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(target.email).replace(/[.]/g, '\\.')}`));
  await page.getByRole('button', { name: /Paciente Zero/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Paciente Zero' });
  await expect(drawer).toBeVisible();
  await axe(page);

  await drawer.getByRole('button', { name: 'Conceder 1 mês de Pro' }).click();
  await confirm(page, 'Cortesia de teste e2e');
  await expect(drawer.getByText(/Pro concedido · Cortesia de teste e2e/)).toContainText(/a_\d+/);
  expect(psql(`select count(*) from entitlement_grants where user_id = '${target.userId}' and source = 'support'`)).toBe('1');

  await drawer.getByRole('button', { name: 'Suspender' }).click();
  await confirm(page, 'Suspeita de conta compartilhada');
  await expect(drawer.getByText('Conta suspensa · Suspeita de conta compartilhada')).toBeVisible();
  expect(psql(`select suspended_at is not null from profiles where user_id = '${target.userId}'`)).toBe('t');
  await expect(drawer.getByRole('button', { name: 'Reativar' })).toBeVisible();
  await page.keyboard.press('Escape');

  // --- maps: opening needs a reason, then the graph shows read-only under the "modo auditoria" banner
  await page.goto(`/admin/mapas?q=${encodeURIComponent(title)}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Mapas' })).toBeVisible();
  await axe(page);
  await page.getByRole('button', { name: new RegExp(title) }).click();
  await page.getByRole('button', { name: 'Abrir (somente leitura)' }).click();
  await confirm(page, 'Chamado do aluno sobre o mapa');
  const viewer = page.getByRole('dialog', { name: title });
  await expect(viewer.getByRole('status')).toContainText('Modo auditoria');
  await expect(viewer.getByText('Lactato')).toBeVisible();
  expect(psql(`select count(*) from admin_audit_log where action = 'map.open_readonly' and target_id = '${board}' and result = 'success'`)).toBe('1');

  // --- referrals: page renders (empty or not), axe clean
  await page.goto('/admin/indicacoes');
  await expect(page.getByRole('heading', { level: 1, name: 'Indicações' })).toBeVisible();
  await axe(page);
});
