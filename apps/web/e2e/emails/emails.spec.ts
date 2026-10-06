// G18 / F24 e2e: needs the API with GET /v1/dev/emails and the local Supabase (point NEXT_PUBLIC_API_URL / API at your own ports).
import { expect, test } from '@playwright/test';
import { API, signUpApi } from '../account/fixture';


const rnd = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

test('prévia /dev/emails lista todas as versões e mostra o assunto de cada uma', async ({ page, request }) => {
  // /dev/emails is dev-only (404 in a production build): detect it from the response, not from an env var the runner may forget
  const res = await page.goto('/dev/emails');
  test.skip(res?.status() === 404, 'dev-only page (production build)');
  const list = ((await (await request.get(`${API}/v1/dev/emails`)).json()) as { data: Array<{ template: string; versions: string[] }> }).data;
  const total = list.reduce((n, l) => n + l.versions.length, 0);
  expect(total).toBeGreaterThan(0);

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
