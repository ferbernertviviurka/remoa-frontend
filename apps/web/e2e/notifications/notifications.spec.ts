// G18 / F26 e2e REAL: the API (:4000) and the local Supabase, no interception of /v1/notifications.
// Needs the backend routes of D2's sibling lane; rows the API cannot write (notify() is server-only) are seeded by SQL.
import { randomUUID as uuid } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { API, psql, signUpApi } from '../account/fixture';
import { signUpViaForm } from '../sign-up';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

const rnd = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

async function seed(userId: string, n: number) {
  for (let i = 0; i < n; i++)
    psql(`insert into notifications (user_id, type, category, href, data, idempotency_key) values ('${userId}', 'review_reminder', 'review', '/app/revisar', '{"cards": ${i + 3}}', 'review_reminder:${uuid()}')`);
}
const idOf = (email: string) => psql(`select id from auth.users where email='${email}'`);

test('bell: badge, popover, mark read, open the destination; page: remove and preferences', async ({ page }) => {
  const email = `e2e-notif-${rnd()}@remoa.test`;
  await signUpViaForm(page, email);
  await seed(idOf(email), 3);
  await page.reload();

  const bell = page.getByRole('button', { name: 'Notificações, 3 não lidas' });
  await expect(bell).toBeVisible();
  await bell.click();
  const dialog = page.getByRole('dialog', { name: 'Central de notificações' });
  await expect(dialog.getByText(/cards? esperam? por você hoje/).first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Marcar como lida' }).first().click();
  // the open popover is modal (hides the bell from the a11y tree): close it before reading the badge
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Notificações, 2 não lidas' })).toBeVisible();

  // Realtime (or the 60 s poll): a new row updates the badge without reloading
  await seed(idOf(email), 1);
  await expect(page.getByRole('button', { name: 'Notificações, 3 não lidas' })).toBeVisible({ timeout: 70_000 });

  await page.getByRole('button', { name: /^Notificações/ }).click();
  await page.getByRole('link', { name: 'Ver todas as notificações' }).click();
  await expect(page).toHaveURL(/\/app\/notificacoes$/);
  await expect(page.getByRole('heading', { name: 'Notificações', level: 1 })).toBeVisible();

  await expect(page.getByRole('button', { name: 'Remover notificação' })).toHaveCount(4); // 3 + 1 seeded after load: count() alone raced the first fetch (QA G18)
  const before = 4;
  await page.getByRole('button', { name: 'Remover notificação' }).first().click();
  await expect(page.getByRole('button', { name: 'Remover notificação' })).toHaveCount(before - 1);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remover notificação' })).toHaveCount(before - 1);

  // preferences save at once and persist
  const sw = page.getByRole('switch', { name: 'Mapa pronto por e-mail' });
  await expect(sw).toBeChecked();
  await sw.click();
  await expect(page.getByText('Preferência salva.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Mapa pronto por e-mail' })).not.toBeChecked();
  await page.getByRole('switch', { name: /Pausar e-mails de lembrete/ }).click();
  await page.getByRole('button', { name: '07:00' }).click();
  await page.reload();
  await expect(page.getByRole('switch', { name: /Pausar e-mails de lembrete/ })).toBeChecked();
  await expect(page.getByRole('button', { name: '07:00' })).toHaveAttribute('aria-pressed', 'true');

  // Minha conta points to the same place
  await page.goto('/app/conta/preferencias');
  await page.getByRole('link', { name: 'Ajustar avisos e e-mails' }).click();
  await expect(page).toHaveURL(/\/app\/notificacoes#preferencias$/);
});

test('another user cannot see or dismiss my notifications', async ({ request }: { request: APIRequestContext }) => {
  const a = await signUpApi(request, `e2e-notif-a-${rnd()}@remoa.test`);
  const b = await signUpApi(request, `e2e-notif-b-${rnd()}@remoa.test`);
  await seed(a.user.id as string, 1);
  const id = psql(`select id from notifications where user_id='${a.user.id}' limit 1`);
  const del = await request.delete(`${API}/v1/notifications/${id}`, { headers: { authorization: `Bearer ${b.access_token as string}` } });
  expect(del.status()).toBe(404);
});
