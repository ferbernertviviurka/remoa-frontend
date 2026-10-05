// TEMP (QA G18): captures real screens for side-by-side. Removed after use.
import { randomUUID as uuid } from 'node:crypto';
import { test, type Page } from '@playwright/test';
import { API, accountUser, psql } from './account/fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
const OUT = process.env.QA_OUT!;
const TZ = 'America/Sao_Paulo';
const ymd = (o: number) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() + o * 86_400_000));
const shot = async (page: Page, n: string) => { await page.mouse.move(2, 2); await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}/${n}.png` }); };

test('capture', async ({ page, request }) => {
  test.setTimeout(300_000);
  const { headers, userId } = await accountUser(page, request, 'Marina Alves');
  await request.post(`${API}/v1/calendar/tour-seen`, { headers });
  const labels = (await (await request.get(`${API}/v1/calendar/labels`, { headers })).json()).data.labels as { id: string; systemKey: string | null }[];
  const L = (k: string) => labels.find((l) => l.systemKey === k)!.id;
  console.log('labels', labels.map((l) => l.systemKey).join(','));
  const mk = (title: string, off: number, startTime: string | null, key: string, extra: object = {}) =>
    request.post(`${API}/v1/calendar/events`, { headers, data: { title, labelId: L(key), date: ymd(off), ...(startTime ? { startTime } : { allDay: true }), location: 'Sala 204 · Bloco B', ...extra } });
  const keys = labels.map((l) => l.systemKey).filter(Boolean) as string[];
  const k = (i: number) => keys[i % keys.length]!;
  const specs: [string, number, string | null][] = [['Prova de Clínica Médica', 1, '08:00'], ['Plantão UPA', 0, '19:00'], ['Entrega do relatório', 2, '10:00'], ['Simulado Enamed', 3, '14:00'], ['Aniversário da Ana', 4, null], ['Reunião do internato', 5, '09:30'], ['Prova de Pediatria', 7, '08:00'], ['Plantão HU', 9, '07:00'], ['Congresso', 12, null], ['Consulta', 14, '16:00']];
  for (const [i, s] of specs.entries()) { const r = await mk(s[0], s[1], s[2], k(i)); if (!r.ok()) console.log('event fail', s[0], r.status(), await r.text()); }
  await page.goto('/app/calendario', { waitUntil: 'domcontentloaded' });
  await page.getByRole('grid', { name: 'Calendário do mês' }).waitFor();
  await shot(page, 'calendario-mes');
  for (const [v, n] of [['Semana', 'semana'], ['Agenda', 'agenda'], ['Galeria', 'galeria']] as const) {
    await page.getByRole('tab', { name: v }).or(page.getByRole('button', { name: v, exact: true })).first().click();
    await page.waitForTimeout(1200);
    await shot(page, `calendario-${n}`);
  }
  await page.getByRole('tab', { name: 'Mês' }).or(page.getByRole('button', { name: 'Mês', exact: true })).first().click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Novo compromisso' }).first().click();
  await page.waitForTimeout(900);
  await shot(page, 'calendario-novo');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Prova de Clínica Médica/ }).first().click();
  await page.waitForTimeout(900);
  await shot(page, 'calendario-evento');
  await page.keyboard.press('Escape');

  await page.goto('/app/hoje');
  await page.waitForTimeout(2500);
  await shot(page, 'hoje-calendario');
  await page.screenshot({ path: `${OUT}/hoje-calendario-full.png`, fullPage: true });

  // bell
  await page.goto('/app/notificacoes');
  await page.waitForTimeout(1500);
  await shot(page, 'sino-vazio-page');
  await page.getByRole('button', { name: /^Notificações/ }).click();
  await page.waitForTimeout(900);
  await shot(page, 'sino-vazio');
  await page.keyboard.press('Escape');
  const types: [string, string, string][] = [['calendar_d1', 'calendar', '/app/calendario'], ['review_reminder', 'review', '/app/revisar'], ['map_ready', 'maps', '/app/mapas'], ['purchase', 'account', '/app/conta/plano'], ['referral_reward', 'account', '/app/indique'], ['calendar_d0', 'calendar', '/app/calendario']];
  for (const [t, c, h] of types) {
    try { psql(`insert into notifications (user_id, type, category, href, data, idempotency_key, created_at) values ('${userId}', '${t}', '${c}', '${h}', '{"cards": 12, "title": "Prova de Clínica Médica", "time": "08:00"}', '${t}:${uuid()}', now() - interval '${types.findIndex((x) => x[0] === t) * 7} hours')`); } catch (e) { console.log('seed fail', t, String(e).slice(0, 200)); }
  }
  await page.goto('/app/hoje');
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /^Notificações/ }).click();
  await page.waitForTimeout(1200);
  await shot(page, 'sino-aberto');
  await page.keyboard.press('Escape');
  await page.goto('/app/notificacoes');
  await page.waitForTimeout(2000);
  await shot(page, 'notificacoes-pagina');
  await page.getByRole('switch', { name: /Pausar e-mails de lembrete/ }).click();
  await page.waitForTimeout(1200);
  await shot(page, 'notificacoes-pausa');
});
