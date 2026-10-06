// G18 / F25 e2e: tutorial na primeira abertura (e não na segunda), criar com imagem, ver em Hoje, desligar aviso, excluir.
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { signUpAndLogin } from '../visual/fixture';

test.use({ viewport: { width: 1440, height: 900 } });

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TZ = 'America/Sao_Paulo';
const ymd = (offset: number) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() + offset * 86_400_000));
// 1×1 PNG: the server crops to 16:9 and makes the WebP variants
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const seeTourDone = (request: APIRequestContext, headers: { authorization: string }) => request.post(`${API}/v1/calendar/tour-seen`, { headers });

async function createViaApi(request: APIRequestContext, headers: { authorization: string }, title: string, date: string, startTime = '08:00') {
  const labels = (await (await request.get(`${API}/v1/calendar/labels`, { headers })).json()).data.labels as { id: string; systemKey: string | null }[];
  const exam = labels.find((l) => l.systemKey === 'exam')!;
  const r = await request.post(`${API}/v1/calendar/events`, { headers, data: { title, labelId: exam.id, date, startTime, location: 'Sala 204 · Bloco B' } });
  expect(r.ok()).toBeTruthy();
  return (await r.json()).data.id as string;
}

const openEvent = async (page: Page, title: string) => {
  await page.getByRole('button', { name: new RegExp(title) }).first().click();
  return page.getByRole('dialog', { name: 'Detalhes do compromisso' });
};

test('tutorial: aparece na primeira abertura e não reaparece sozinho', async ({ page, request }) => {
  test.setTimeout(120_000);
  await signUpAndLogin(page, request);
  await page.goto('/app/calendario');
  const tour = page.getByRole('dialog', { name: 'Como o calendário funciona' });
  await expect(tour).toBeVisible();
  await expect(tour.getByText(/Passo 1 de 5/)).toBeVisible();
  await tour.getByRole('button', { name: 'Próximo' }).click();
  await expect(tour.getByText(/Passo 2 de 5/)).toBeVisible();
  await page.keyboard.press('Escape'); // fechar de qualquer forma grava "visto"
  await expect(tour).toBeHidden();

  await page.reload();
  await expect(page.getByRole('grid', { name: 'Calendário do mês' })).toBeVisible();
  await expect(tour).toBeHidden();

  // reabre pela lateral, sem o passo de criar
  await page.getByRole('button', { name: 'Como o calendário funciona' }).click();
  await expect(tour).toBeVisible();
  for (let i = 0; i < 4; i++) await tour.getByRole('button', { name: 'Próximo' }).click();
  await expect(tour.getByRole('button', { name: 'Criar meu primeiro compromisso' })).toHaveCount(0);
});

test('criar com imagem, ver em Hoje, desligar um aviso e excluir', async ({ page, request }) => {
  test.setTimeout(180_000);
  const { headers } = await signUpAndLogin(page, request);
  await seeTourDone(request, headers);
  await page.goto('/app/calendario');
  await expect(page.getByRole('grid', { name: 'Calendário do mês' })).toBeVisible();
  await expect(page.getByText('Seu calendário está vazio.')).toBeVisible();

  // criar com capa pelo botão
  await page.getByRole('button', { name: 'Novo compromisso' }).first().click();
  const modal = page.getByRole('dialog', { name: 'Novo compromisso' });
  await expect(modal.getByRole('button', { name: 'Salvar compromisso' })).toBeDisabled();
  await modal.getByLabel('Título').fill('Prova de Clínica Médica');
  await modal.getByLabel('Data').fill(ymd(1));
  await modal.getByLabel('Início').fill('08:00');
  await modal.getByLabel('Local').fill('Sala 204 · Bloco B');
  await modal.locator('input[type=file]').first().setInputFiles({ name: 'edital.png', mimeType: 'image/png', buffer: PNG });
  await expect(modal.getByRole('img', { name: 'Prévia da capa em 16:9' })).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Salvar compromisso' })).toBeEnabled({ timeout: 30_000 });
  // P-361/D-833: the toast and the drawer are optimistic (FR-22); Hoje only sees the event once the POST has committed, so wait for it
  const saved = page.waitForResponse((r) => r.url().includes('/v1/calendar/events') && r.request().method() === 'POST');
  await modal.getByRole('button', { name: 'Salvar compromisso' }).click();
  await saved;
  await expect(page.getByText('Compromisso salvo. Avisamos por e-mail 1 dia antes e no dia.')).toBeVisible();
  const drawer = page.getByRole('dialog', { name: 'Detalhes do compromisso' });
  await expect(drawer.getByRole('heading', { name: 'Prova de Clínica Médica' })).toBeVisible();
  await expect(drawer.getByText('Sala 204 · Bloco B')).toBeVisible();
  await expect(drawer.getByText(/às 18:00/)).toBeVisible();
  await expect(drawer.getByText(/às 07:00/)).toBeVisible();

  // Hoje: faixa âmbar e card
  await page.goto('/app/hoje');
  await expect(page.getByRole('link', { name: 'Compromisso chegando' })).toContainText('Amanhã às 08:00: Prova de Clínica Médica');
  const card = page.getByRole('region', { name: 'Próximos compromissos' });
  await expect(card.getByText('Prova de Clínica Médica')).toBeVisible();
  await expect(card.getByText('Amanhã', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: /Calendário/ })).toContainText('Há compromisso nas próximas 24 horas');

  // desligar o aviso "1 dia antes" e conferir que ficou salvo
  await page.goto('/app/calendario');
  const d1 = await openEvent(page, 'Prova de Clínica Médica');
  await expect(d1.getByRole('switch', { name: '1 dia antes' })).toBeChecked();
  await d1.getByRole('switch', { name: '1 dia antes' }).click();
  await expect(d1.getByRole('switch', { name: '1 dia antes' })).not.toBeChecked();
  await page.reload();
  const d2 = await openEvent(page, 'Prova de Clínica Médica');
  await expect(d2.getByRole('switch', { name: '1 dia antes' })).not.toBeChecked();
  await expect(d2.getByRole('switch', { name: 'No dia' })).toBeChecked();

  // excluir com confirmação
  await d2.getByRole('button', { name: 'Excluir' }).click();
  await expect(d2.getByText('Os avisos agendados também serão cancelados.')).toBeVisible();
  await d2.getByRole('button', { name: 'Excluir' }).click();
  await expect(page.getByRole('button', { name: /Prova de Clínica Médica/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: /Prova de Clínica Médica/ })).toHaveCount(0);
  await expect(page.getByText('Seu calendário está vazio.')).toBeVisible();
});

test('visões, etiqueta escondida e tecla N', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  await seeTourDone(request, headers);
  await createViaApi(request, headers, 'Prova de Cirurgia', ymd(2), '14:00');
  await page.goto('/app/calendario');
  await expect(page.getByRole('button', { name: /Prova de Cirurgia/ })).toBeVisible();

  await page.getByRole('button', { name: 'Galeria' }).click();
  await expect(page.getByRole('button', { name: /Prova de Cirurgia/ })).toBeVisible();
  await page.reload(); // a visão fica salva
  await expect(page.getByRole('button', { name: 'Galeria', pressed: true })).toBeVisible();

  await page.getByRole('switch', { name: 'Mostrar Prova' }).click();
  await expect(page.getByRole('button', { name: /Prova de Cirurgia/ })).toHaveCount(0);
  await page.getByRole('switch', { name: 'Mostrar Prova' }).click();
  await expect(page.getByRole('button', { name: /Prova de Cirurgia/ })).toBeVisible();

  await page.getByRole('heading', { level: 1 }).click();
  await page.keyboard.press('n');
  await expect(page.getByRole('dialog', { name: 'Novo compromisso' })).toBeVisible();
});
