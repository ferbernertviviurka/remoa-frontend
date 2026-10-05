// F16 T5: landing shell (header, anchors, variants, mobile menu, waitlist, axe). Public route: no login; API on :4000.
import { gotoLanding } from './ready';
import { signUpViaForm } from '../sign-up';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { strings } from '@remoa/strings';

const L = strings.landing;
const waitlistPhase = (process.env.NEXT_PUBLIC_LAUNCH_PHASE ?? 'waitlist') !== 'open';

const axe = async (page: Page) => {
  await page.waitForTimeout(800); // axe reads opacity mid-animation
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('header anchors scroll to their sections and mark the active one', async ({ page }) => {
    await gotoLanding(page, '/');
    const nav = page.getByRole('navigation', { name: L.nav.navLabel });
    for (const [label, id] of [[L.nav.anchors.howWorks, 'como-funciona'], [L.nav.anchors.features, 'recursos'], [L.nav.anchors.plans, 'planos'], [L.nav.anchors.faq, 'faq']] as const) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
      await expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'location');
    }
    for (const id of ['topo', 'como-funciona', 'recursos', 'experimente', 'planos', 'faq', 'cta']) await expect(page.locator(`#${id}`)).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('?h=b changes the H1 and the page is noindex; the root is indexable with a canonical', async ({ page }) => {
    await gotoLanding(page, '/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(L.hero.h1.a.split('.')[0]!);
    await expect(page.locator('meta[name=robots][content*=noindex]')).toHaveCount(0);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /^https?:\/\/[^/]+\/?$/);
    await gotoLanding(page, '/?h=b');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(L.hero.h1.b.split('.')[0]!);
    await expect(page.locator('meta[name=robots][content*=noindex]')).toHaveCount(1);
  });

  test('?v=29 shows the variant price only in the waitlist phase', async ({ page, request }) => {
    const book = await request.get('http://localhost:4000/v1/public/pricebook');
    test.skip(!book.ok(), 'API without the public pricebook (needs STRIPE=mock)');
    await gotoLanding(page, '/?v=29');
    const plans = page.locator('#planos');
    if (waitlistPhase) await expect(plans).toContainText('29,00');
    else await expect(plans).not.toContainText('29,00');
  });

  test('skip link moves focus to the content', async ({ page }) => {
    await gotoLanding(page, '/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: L.nav.skipLink })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#conteudo$/);
  });

  test('waitlist: happy path and invalid e-mail', async ({ page }) => {
    test.skip(!waitlistPhase, 'form only in waitlist phase');
    await gotoLanding(page, '/#cta');
    const cta = page.locator('#cta');
    await cta.getByLabel(L.waitlist.email.label).fill('nope');
    await cta.getByRole('button', { name: L.waitlist.submit }).click();
    await expect(cta.getByRole('alert')).toBeVisible();
    await cta.getByLabel(L.waitlist.email.label).fill(`lp-${Date.now()}@example.com`);
    await cta.getByRole('button', { name: L.waitlist.submit }).click();
    const ok = cta.getByRole('status');
    await expect(ok).toContainText(L.waitlist.success.title);
    await expect(ok).toBeFocused();
    await cta.getByRole('button', { name: L.waitlist.success.alternate }).click();
    await expect(cta.getByLabel(L.waitlist.email.label)).toHaveValue('');
  });

  test('axe: whole page', async ({ page }) => {
    await gotoLanding(page, '/');
    expect(await axe(page)).toEqual([]);
  });
});

test.describe('mobile 390', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('menu opens, links navigate and close it; no horizontal scroll', async ({ page }) => {
    await gotoLanding(page, '/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('navigation', { name: L.nav.navLabel }).first()).toBeHidden();
    const menu = page.getByRole('button', { name: L.nav.menu.aria });
    const box = await menu.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('dialog').getByRole('link', { name: L.nav.anchors.plans }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('#planos')).toBeInViewport();
    await menu.click();
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
  });

  test('axe: whole page', async ({ page }) => {
    await gotoLanding(page, '/');
    expect(await axe(page)).toEqual([]);
  });
});

// D-534: `/` is static now; the session swap (D-320) happens in the browser.
test('signed in: the static landing swaps Entrar for the way back into the app, with the avatar', async ({ page }) => {
  await signUpViaForm(page, `lp-signed-${Date.now()}@remoa.test`);
  await gotoLanding(page, '/');
  const header = page.getByRole('banner');
  await expect(header.getByRole('link', { name: L.nav.openApp }).first()).toHaveAttribute('href', '/app');
  await expect(header.getByRole('link', { name: L.nav.account })).toHaveAttribute('href', '/app/conta/perfil');
  await expect(header.getByRole('link', { name: L.nav.signIn })).toHaveCount(0);
});
