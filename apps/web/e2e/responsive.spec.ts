// G02 / RS2: responsivo mobile (390x844). Sem overflow horizontal, alvos de toque >= 44 px e baselines visuais das telas principais.
// Fotos para revisão: SHOTS_OUT=<dir> grava PNGs de página inteira em 360, 390, 768 e 1024.
import { expect, test, type Page } from '@playwright/test';
import { mask, seedMock, signUpAndLogin } from './visual/fixture';

const measure = (page: Page) =>
  page.evaluate(() => {
    const visible = (e: Element) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('nextjs-portal, [aria-hidden="true"]');
    };
    const sel = 'a[href],button,input:not([type=hidden]):not([type=file]),select,textarea,[role=button],[role=tab],[role=checkbox],[role=switch]';
    const small = [...document.querySelectorAll(sel)]
      // Exceção WCAG 2.5.8 (inline): link no meio de um texto corrido ("Já tem conta? Entrar") não precisa de 44 px.
      .filter((e) => visible(e) && !(e.tagName === 'A' && getComputedStyle(e).display === 'inline'))
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { el: `${e.tagName.toLowerCase()} "${(e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 30)}"`, w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter((x) => x.w < 44 || x.h < 44);
    const wide = [...document.querySelectorAll('body *')].filter((e) => visible(e) && e.getBoundingClientRect().right > innerWidth + 1).slice(0, 4).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 60)}`);
    return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, small, wide };
  });

async function check(page: Page, name: string) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  const m = await measure(page);
  expect(m.scrollWidth, `${name}: overflow horizontal (${m.wide.join(' | ')})`).toBeLessThanOrEqual(m.innerWidth);
  expect(m.small, `${name}: alvos < 44 px`).toEqual([]);
  await page.mouse.move(2, 2);
  return m;
}

async function dump(page: Page, name: string) {
  const out = process.env.SHOTS_OUT;
  if (!out) return;
  const vp = page.viewportSize()!;
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${out}/${name}-${vp.width}.png`, fullPage: true, animations: 'disabled' });
}

test.describe('responsivo 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, colorScheme: 'light' });

  test('telas logadas: sem overflow, alvos >= 44 px, baselines mobile', async ({ page, request }) => {
    test.setTimeout(240_000);
    const { email, userId, headers } = await signUpAndLogin(page, request);
    await seedMock(request, headers, userId);
    const shot = async (name: string, extra: ReturnType<Page['locator']>[] = []) => {
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(name, { mask: [...mask(page, email), ...extra], animations: 'disabled', maxDiffPixelRatio: 0.02 });
    };

    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Abrir o mapa Sepse' })).toBeVisible();
    await check(page, 'hoje');
    await shot('m-hoje.png', [page.getByRole('heading', { level: 1 }), page.locator('h1').locator('xpath=preceding-sibling::span')]);

    // bottom-nav: mesmos destinos do trilho, badge do Revisar, sem cobrir o fim da página
    const nav = page.getByRole('navigation', { name: 'Navegação inferior' });
    for (const n of ['Hoje', 'Mapas', 'Revisar', 'Enamed', 'Loja', 'Conta']) await expect(nav.getByRole('link', { name: new RegExp(n) })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Revisar/ })).toHaveAccessibleName(/\d/);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const last = await page.evaluate(() => {
      const aside = document.querySelector('aside')!.getBoundingClientRect();
      return { bottom: aside.bottom + scrollY, nav: document.querySelector('nav[aria-label="Navegação inferior"]')!.getBoundingClientRect().height };
    });
    expect(last.bottom).toBeLessThanOrEqual(await page.evaluate(() => scrollY + innerHeight - 0) - last.nav);
    await dump(page, 'hoje');

    await page.goto('/mapas');
    await expect(page.getByRole('link', { name: 'Sepse' }).first()).toBeVisible();
    await check(page, 'mapas (grade)');
    await shot('m-mapas.png');
    await dump(page, 'mapas');
    await expect(async () => { // clique antes da hidratação é perdido
      await page.getByRole('button', { name: 'Ver em lista' }).click();
      await expect(page.getByRole('button', { name: 'Ver em lista' })).toHaveAttribute('aria-pressed', 'true', { timeout: 2000 });
    }).toPass({ timeout: 15_000 });
    await check(page, 'mapas (lista)');
    await dump(page, 'mapas-lista');

    await page.goto('/mapas/novo');
    await expect(page.getByRole('button', { name: /Em branco/ })).toBeVisible();
    await check(page, 'novo mapa 1');
    await shot('m-novo-mapa.png');
    await dump(page, 'novo1');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await check(page, 'novo mapa 2');
    await dump(page, 'novo2');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await check(page, 'novo mapa 3');
    await dump(page, 'novo3');

    await page.goto('/revisar');
    await expect(page.getByRole('button', { name: 'Começar revisão' })).toBeVisible();
    await check(page, 'revisar');
    await shot('m-revisar.png');
    await dump(page, 'revisar');

    for (const [name, url] of [['cobertura', '/cobertura'], ['loja', '/loja']] as const) {
      await page.goto(url);
      await check(page, name);
      await dump(page, name);
    }
    // /conta é da F13 (outra sessão): só overflow, sem alvos.
    await page.goto('/conta');
    await page.waitForLoadState('networkidle');
    const m = await measure(page);
    expect(m.scrollWidth, 'conta: overflow horizontal').toBeLessThanOrEqual(m.innerWidth);
  });

  test('telas públicas: landing, entrar, cadastro', async ({ page }) => {
    for (const [name, url] of [['landing', '/'], ['entrar', '/entrar'], ['cadastro', '/cadastro']] as const) {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await check(page, name);
      await dump(page, name);
    }
  });
});

// Só fotos (sem asserções): celular pequeno, tablet e 1024 para a revisão de design.
for (const [w, h] of [[360, 740], [768, 1024], [1024, 768]] as const) {
  test(`fotos ${w}x${h}`, async ({ page, request }) => {
    test.skip(!process.env.SHOTS_OUT, 'SHOTS_OUT não definido');
    test.setTimeout(300_000);
    await page.setViewportSize({ width: w, height: h });
    const { userId, headers } = await signUpAndLogin(page, request);
    await seedMock(request, headers, userId);
    for (const [name, url] of [['hoje', '/'], ['mapas', '/mapas'], ['novo1', '/mapas/novo'], ['revisar', '/revisar'], ['cobertura', '/cobertura'], ['loja', '/loja']] as const) {
      await page.goto(url);
      await dump(page, name);
      const m = await measure(page);
      console.log(`SHOT ${name}@${w} scrollWidth=${m.scrollWidth} iw=${m.innerWidth} small=${JSON.stringify(m.small)}`);
    }
    await page.getByRole('link', { name: /Hoje|Início/ }).first().isVisible().catch(() => false);
  });
}
