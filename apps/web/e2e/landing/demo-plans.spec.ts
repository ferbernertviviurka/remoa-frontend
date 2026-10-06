import { expect, test, type Page } from '@playwright/test';
import { gotoLanding } from './ready';
import AxeBuilder from '@axe-core/playwright';
import { strings } from '@remoa/strings/full';

// Landing page path; T5 assembles it at "/". LANDING_PATH lets a preview route stand in.
const PATH = process.env.LANDING_PATH ?? '/';
const d = strings.landing.demo;
const events = (page: Page) => page.evaluate(() => (window.__remoaEvents ?? []).map((e) => e.event));

test.beforeEach(async ({ page }) => { await gotoLanding(page, PATH); });

test('demo: answer correctly, reveal step 5, retry, verdict announced', async ({ page }) => {
  const demo = page.locator('#experimente');
  await demo.scrollIntoViewIfNeeded();
  await demo.getByRole('button', { name: new RegExp(d.alternatives[d.correctIndex]!) }).click();
  await expect(demo.getByRole('status')).toContainText(d.verdicts.correct);
  await expect(demo.getByRole('status')).toContainText(d.demoLabel);
  await expect(demo.getByRole('link', { name: d.cta })).toBeVisible();
  await expect.poll(() => events(page)).toEqual(expect.arrayContaining(['demo_started', 'demo_answered', 'demo_completed']));
  await page.waitForTimeout(600); // pop animation
  await demo.screenshot({ path: 'test-results/landing-experimente-certo.png' });
  await demo.getByRole('button', { name: d.retry }).click();
  await expect(demo.getByRole('status')).toHaveCount(0);
});

test('plans: toggle changes price and label', async ({ page }) => {
  const plans = page.locator('#planos');
  await plans.scrollIntoViewIfNeeded();
  const pro = plans.getByRole('article', { name: strings.landing.plans.pro.name });
  const annual = plans.getByRole('button', { name: new RegExp(strings.landing.plans.period.annual) });
  await annual.hover(); // D-560: o Torph só baixa quando a mão chega perto do seletor
  const before = await pro.locator('[torph-sr]').first().textContent();
  await plans.screenshot({ path: 'test-results/landing-planos-mensal.png' });
  await annual.click();
  await expect(pro.locator('[torph-sr]').first()).not.toHaveText(before!);
  await expect(pro).toContainText(/\/ano/);
  await page.waitForTimeout(600);
  await plans.screenshot({ path: 'test-results/landing-planos-anual.png' });
  await expect.poll(() => events(page)).toEqual(expect.arrayContaining(['pricing_viewed', 'pricing_toggled']));
});

test('faq: first open, keyboard toggles one at a time', async ({ page }) => {
  const qs = page.locator('#faq').getByRole('button');
  await expect(qs.first()).toHaveAttribute('aria-expanded', 'true');
  await qs.nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(qs.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await expect(qs.first()).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => events(page)).toContain('faq_opened');
});

test('axe: demo, comparison, plans, faq have no violations', async ({ page }) => {
  const r = await new AxeBuilder({ page }).include('#experimente').include('#comparacao').include('#planos').include('#faq').analyze();
  expect(r.violations).toEqual([]);
});
