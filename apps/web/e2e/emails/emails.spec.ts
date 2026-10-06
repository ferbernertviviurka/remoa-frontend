// G18 / F24 e2e: needs the API with GET /v1/dev/emails and the local Supabase (point NEXT_PUBLIC_API_URL / API at your own ports).
import { expect, test } from '@playwright/test';
import { API, signUpApi } from '../account/fixture';

// /dev/emails is a dev-only page (404 in a production build): E2E_PROD=1 skips it
test.skip(!!process.env.E2E_PROD, 'dev-only page');

const rnd = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

test('prévia /dev/emails lista todas as versões e mostra o assunto de cada uma', async ({ page, request }) => {
  const list = ((await (await request.get(`${API}/v1/dev/emails`)).json()) as { data: Array<{ template: string; versions: string[] }> }).data;
  const total = list.reduce((n, l) => n + l.versions.length, 0);
  expect(total).toBeGreaterThan(0);

  await page.goto('/dev/emails');
  const buttons = page.getByRole('navigation', { name: 'Modelos' }).getByRole('button');
  await expect(buttons).toHaveCount(total);

  const { template, versions } = list[list.length - 1]!;
  const version = versions[versions.length - 1]!;
  const mail = ((await (await request.get(`${API}/v1/dev/emails/${template}/${version}`)).json()) as { data: { subject: string } }).data;
  await page.getByRole('button', { name: `${template} · ${version}` }).click();
  await expect(page.getByTestId('email-subject')).toHaveText(mail.subject);

  await page.getByRole('radio', { name: '360 px' }).click();
  await expect(page.getByTitle('Prévia do e-mail')).toHaveCSS('width', '360px');
  await page.getByRole('radio', { name: 'Texto simples' }).click();
  await expect(page.locator('pre')).not.toBeEmpty();
});

test('recuperar senha mostra a mesma mensagem para e-mail existente e inexistente', async ({ page, request }) => {
  const email = `e2e-reset-${rnd()}@remoa.test`;
  await signUpApi(request, email);
  const shown = async (to: string) => {
    await page.goto('/recuperar-senha');
    await page.getByLabel('E-mail').fill(to);
    await page.getByRole('button', { name: 'Enviar link' }).click();
    await expect(page.getByRole('status')).toContainText('Se houver uma conta');
    return page.getByRole('status').innerText();
  };
  const a = await shown(email);
  expect(a).toContain('Se houver uma conta');
  expect(await shown(`nao-existe-${rnd()}@remoa.test`)).toBe(a);
});
