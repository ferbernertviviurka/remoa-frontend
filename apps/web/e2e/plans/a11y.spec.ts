// F15 / G05 T8: axe (Free, anual + cupom, Pro, sucesso, overlay), teclado, aria-live, alvos de toque e movimento reduzido.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createSession, makeBoards, planUser, subscribe } from './fixture';

test.use({ viewport: { width: 1440, height: 900 } });

const axe = async (page: Page) => {
  await page.waitForTimeout(1500); // axe lê opacidade no meio de transições (slide 450 ms, barras 900 ms, anel 900 ms)
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};
const summaryOf = (page: Page) => page.getByRole('complementary', { name: 'Resumo do pedido' });

test('axe: Free com aviso, anual com cupom e overlay "Abrindo o pagamento seguro"', async ({ page, request }) => {
  test.setTimeout(150_000);
  const { headers } = await planUser(page, request);
  await makeBoards(request, headers, 2);
  await page.goto('/app/planos');
  await expect(page.getByRole('table', { name: 'Comparação entre Free e Pro' })).toBeVisible();
  expect(await axe(page), 'free').toEqual([]);

  await page.getByRole('radio', { name: /Anual/ }).or(page.getByRole('button', { name: /Anual/ })).first().click();
  const s = summaryOf(page);
  await s.getByRole('button', { name: 'Tenho um código de fundador' }).click();
  await s.getByLabel('Código de fundador').fill('NAOEXISTE');
  await s.getByRole('button', { name: 'Aplicar' }).click();
  await expect(s.getByText('Código não reconhecido. Confira e tente de novo.')).toBeVisible();
  expect(await axe(page), 'cupom inválido').toEqual([]);
  await s.getByLabel('Código de fundador').fill('FUNDADOR');
  await s.getByRole('button', { name: 'Aplicar' }).click();
  await expect(s.getByText('Preço de fundador aplicado')).toBeVisible();
  expect(await axe(page), 'anual + fundador').toEqual([]);

  await page.route('**/v1/billing/checkout', async (route) => { await new Promise((r) => setTimeout(r, 4000)); await route.continue(); });
  await s.getByRole('button', { name: 'Assinar o Pro' }).click();
  await expect(page.getByText('Abrindo o pagamento seguro')).toBeVisible();
  expect(await axe(page), 'overlay').toEqual([]);
});

test('axe: Pro (assinante) e sucesso', async ({ page, request }) => {
  test.setTimeout(150_000);
  const { headers } = await planUser(page, request);
  await subscribe(request, headers, 'monthly', 'card');
  await page.goto('/app/planos');
  await expect(page.getByRole('heading', { level: 1, name: 'Você está no Pro.' })).toBeVisible();
  expect(await axe(page), 'pro').toEqual([]);

  const other = await planUser(page, request);
  const { url } = await createSession(request, other.headers, { period: 'monthly', method: 'card' });
  await page.goto(url);
  await expect(page.getByRole('dialog', { name: 'Você agora é Pro.' })).toBeVisible();
  expect(await axe(page), 'sucesso').toEqual([]);
});

test('teclado: período, forma de pagamento, cupom e FAQ; aria-live só com o total final; alvos >= 44 px', async ({ page, request }) => {
  test.setTimeout(120_000);
  await planUser(page, request);
  await page.goto('/app/planos');
  await page.waitForLoadState('networkidle');
  const s = summaryOf(page);

  // aria-live: um só trecho no resumo e ele diz o total final, nunca um quadro da animação
  const live = s.locator('[aria-live] [torph-sr]');
  await expect(live).toHaveCount(1);
  await expect(live).toHaveText('R$ 39,00');

  // período por teclado (grupo de botões/radios com setas ou Tab+Enter)
  const annual = page.getByRole('radio', { name: /Anual/ }).or(page.getByRole('button', { name: /Anual/ })).first();
  await annual.focus();
  await page.keyboard.press('Enter');
  await expect(live).toHaveText('R$ 349,00');

  // forma de pagamento: setas movem a seleção; foco visível
  const pix = s.getByRole('radio', { name: /^Pix/ });
  const card = s.getByRole('radio', { name: /^Cartão/ });
  await pix.focus();
  await page.keyboard.press('ArrowRight');
  await expect(card).toBeChecked();
  await expect(card).toBeFocused();

  // cupom: Enter abre e o foco vai ao campo; Enter no campo aplica
  const toggle = s.getByRole('button', { name: 'Tenho um código de fundador' });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(s.getByLabel('Código de fundador')).toBeFocused();
  await page.keyboard.type('FUNDADOR');
  await page.keyboard.press('Enter');
  await expect(s.getByText('Preço de fundador aplicado')).toBeVisible();
  await expect(live).not.toHaveText('R$ 349,00');

  // alvos >= 44 px (controles interativos da tela)
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('main button, main a, main [role=radio], main input')]
      .filter((e) => e.offsetParent !== null && !e.closest('[inert]') && !e.matches('.sr-only'))
      .map((e) => ({ n: (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 30), h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width }))
      .filter((b) => b.h > 0 && (b.h < 44 || b.w < 44) && !(b.n && b.h >= 44)),
  );
  expect(small).toEqual([]);

  // FAQ: Tab alcança, Enter abre, Espaço troca
  const q = page.locator('h3 button[aria-expanded]');
  await q.nth(2).focus();
  await page.keyboard.press('Enter');
  await expect(q.nth(2)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Space');
  await expect(q.nth(2)).toHaveAttribute('aria-expanded', 'false');
});

const noAnimation = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('main *, header *, [role=dialog] *')]
      .filter((e) => {
        const c = getComputedStyle(e);
        return (c.animationName !== 'none' && c.animationDuration !== '0s') || [...c.transitionDuration.split(',')].some((d) => parseFloat(d) > 0);
      })
      .map((e) => `${e.tagName}.${String(e.getAttribute('class')).slice(0, 40)}`)
      .slice(0, 8),
  );

for (const mode of ['sistema', 'preferência'] as const) {
  test(`movimento reduzido (${mode}): nenhuma animação roda e o estado final aparece`, async ({ page, request }) => {
    test.setTimeout(120_000);
    if (mode === 'sistema') await page.emulateMedia({ reducedMotion: 'reduce' });
    const { headers } = await planUser(page, request);
    await makeBoards(request, headers, 2);
    if (mode === 'preferência') {
      await page.goto('/app/conta/preferencias');
      await page.getByRole('switch', { name: 'Reduzir movimento' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
      await page.waitForTimeout(800); // PATCH + cookie
    }
    await page.goto('/app/planos');
    await expect(page.getByRole('table', { name: 'Comparação entre Free e Pro' })).toBeVisible();
    if (mode === 'preferência') await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    expect(await noAnimation(page), 'matriz, barras e cabeçalho').toEqual([]);

    // o preço vai direto ao valor final, sem quadros intermediários
    const frames: string[] = [];
    await page.exposeFunction('__frame', (v: string) => frames.push(v));
    await page.evaluate(() => {
      const el = document.querySelector('aside[aria-label="Resumo do pedido"] [data-testid=ticker-frame]');
      if (el) new MutationObserver(() => (window as unknown as { __frame: (v: string) => void }).__frame(el.textContent ?? '')).observe(el, { childList: true, characterData: true, subtree: true });
    });
    await page.getByRole('radio', { name: /Anual/ }).or(page.getByRole('button', { name: /Anual/ })).first().click();
    await expect(summaryOf(page).locator('[aria-live]').first()).toHaveText('R$ 349,00');
    await page.waitForTimeout(600);
    expect(frames.filter((f) => f.replace(/\s/g, ' ') !== 'R$ 349,00')).toEqual([]);
    expect(await noAnimation(page), 'após alternar o período').toEqual([]);

    await page.route('**/v1/billing/checkout', async (route) => { await new Promise((r) => setTimeout(r, 3000)); await route.continue(); });
    await summaryOf(page).getByRole('button', { name: 'Assinar o Pro' }).click();
    await expect(page.getByText('Abrindo o pagamento seguro')).toBeVisible();
    expect(await noAnimation(page), 'overlay').toEqual([]);
  });
}
