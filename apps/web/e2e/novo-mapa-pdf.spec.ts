// G14 D1 (D-580/D-581): criar mapa por PDF de verdade (stream FlateDecode, como Word/Google Docs exportam) com a API em AI=mock.
// Antes: o PDF comprimido saía vazio e o job falhava como pdf_unreadable. Precisa da API com AI=mock (o webServer do playwright passa).
import { deflateSync } from 'node:zlib';
import { expect, test } from '@playwright/test';
import { psql } from './db';
import { signUpAndLogin } from './visual/fixture';

function compressedPdf(lines: string[]): Buffer {
  const content = deflateSync(Buffer.from(`BT /F1 12 Tf 50 700 Td ${lines.map((l) => `(${l}) Tj 0 -20 Td`).join(' ')} ET`, 'latin1'));
  const objs = [
    Buffer.from('<</Type/Catalog/Pages 2 0 R>>'),
    Buffer.from('<</Type/Pages/Kids[3 0 R]/Count 1>>'),
    Buffer.from('<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>'),
    Buffer.concat([Buffer.from(`<</Length ${content.length}/Filter/FlateDecode>>stream\n`), content, Buffer.from('\nendstream')]),
    Buffer.from('<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>'),
  ];
  const parts = [Buffer.from('%PDF-1.4\n')];
  const offsets: number[] = [];
  let size = parts[0]!.length;
  objs.forEach((o, i) => {
    const obj = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), o, Buffer.from('\nendobj\n')]);
    offsets.push(size);
    parts.push(obj);
    size += obj.length;
  });
  const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  parts.push(Buffer.from(`${xref}trailer<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${size}\n%%EOF\n`));
  return Buffer.concat(parts);
}

test.use({ viewport: { width: 1440, height: 900 } });

test('novo mapa por PDF comprimido gera o rascunho e abre o editor (AI=mock)', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { userId } = await signUpAndLogin(page, request);
  // o plano Free limita gerações por IA (402); este teste é do parser de PDF, não do limite
  psql(`insert into subscriptions (user_id, plan, status) values ('${userId}','pro','active') on conflict (user_id) do update set plan='pro'`);
  await page.goto('/app/mapas/novo?caminho=pdf');
  await page.getByRole('button', { name: 'Continuar' }).click();
  const pdf = compressedPdf(['Insuficiencia cardiaca com fracao de ejecao reduzida', 'Tratamento inclui betabloqueador e inibidor da ECA']);
  await page.locator('input[type=file]').setInputFiles({ name: 'ic.pdf', mimeType: 'application/pdf', buffer: pdf });
  await page.getByRole('button', { name: 'Continuar' }).click();
  const generated = page.waitForResponse((r) => r.url().endsWith('/v1/ai/generate-pdf'));
  await page.getByRole('button', { name: 'Gerar rascunho do mapa' }).click();
  expect((await generated).status()).toBe(200);
  await page.waitForURL(/\/app\/mapas\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await expect(page.getByText('Insuficiencia cardiaca com fracao de ejecao reduzida').first()).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: test.info().outputPath('mapa-por-pdf.png') });
});
