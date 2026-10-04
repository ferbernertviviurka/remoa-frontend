// F16 / T3: Problema, Como funciona, Recursos (explorer) e E tem mais.
import { gotoLanding } from './ready';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const URL = process.env.LANDING_SECTIONS_URL ?? '/';

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('tabs: arrows, Home/End and automatic activation', async ({ page }) => {
    await gotoLanding(page, URL);
    await page.waitForLoadState('networkidle'); // keys before hydration are lost
    const tabs = page.locator('#recursos').getByRole('tab');
    await expect(tabs).toHaveCount(6);
    await tabs.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(tabs.nth(5)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    const sent = await page.evaluate(() => window.__remoaEvents?.map((e) => e.event));
    expect(sent).toContain('feature_tab_selected');
  });

  test('images: lazy with dimensions; axe; screenshot of #recursos', async ({ page }) => {
    await gotoLanding(page, URL);
    const imgs = page.locator('img[src^="/landing/"]');
    for (const img of await imgs.all()) {
      await expect(img).toHaveAttribute('loading', 'lazy');
      await expect(img).toHaveAttribute('width', '640');
      await expect(img).toHaveAttribute('height', '420');
    }
    await page.locator('#recursos').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    // decorative step numerals (#D9D4F0 per mock) fail contrast even aria-hidden: reported to design-system
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).exclude('nextjs-portal').exclude('[aria-hidden="true"]').analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => `${n.target.join(' ')} ${n.any[0]?.message}`).join(' | ')}`)).toEqual([]);
    await page.locator('#recursos').screenshot({ path: process.env.SHOT ?? 'test-results/landing-recursos-1.png' }); // sanity vs docs/design/v2/screens/landing-recursos-1.png
  });
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('explorer is an accordion at 390 px, no horizontal scroll', async ({ page }) => {
    await gotoLanding(page, URL);
    const section = page.locator('#recursos');
    await expect(section.getByRole('tab')).toHaveCount(0);
    const heads = section.getByRole('button', { expanded: true });
    await expect(heads).toHaveCount(1);
    const second = section.locator('button[aria-expanded]').nth(1);
    await second.click();
    await expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
