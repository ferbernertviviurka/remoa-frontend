// G28-P / F35 FR-37..FR-40: hero course picker, "Para quem é", FAQ, health-area copy. Public route: no login.
import { gotoLanding } from './ready';
import { expect, test } from '@playwright/test';
import { strings } from '@remoa/strings/full';

const L = strings.landing;
const open = process.env.NEXT_PUBLIC_LAUNCH_PHASE !== 'waitlist';

test.describe('health-area landing', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('hero tag, "Para quem é" section and the Enamed note', async ({ page }) => {
    await gotoLanding(page, '/');
    await expect(page.getByText(L.hero.tag)).toBeVisible();
    const areas = page.locator('#areas');
    await expect(areas.getByRole('heading', { level: 2, name: L.areas.title })).toBeVisible();
    for (const c of L.areas.cards) await expect(areas.getByRole('heading', { level: 3, name: c.title })).toBeVisible();
    await expect(areas.getByText(L.areas.note)).toBeVisible();
  });

  test('picking a course changes the message and carries curso to the sign-up CTA (open phase)', async ({ page }) => {
    test.skip(!open, 'sign-up CTA only in the open phase');
    await gotoLanding(page, '/');
    const group = page.getByRole('group', { name: L.picker.chipsLabel });
    await expect(group.getByRole('button')).toHaveCount(7);
    await group.getByRole('button', { name: 'Enfermagem' }).click();
    await expect(page.getByText(/^Para Enfermagem:/)).toContainText('a caminho');
    await expect(page.getByRole('link', { name: L.hero.cta.primary }).first()).toHaveAttribute('href', '/cadastro?curso=nursing&de=landing');
    await group.getByRole('button', { name: 'Medicina' }).click();
    await expect(page.getByText(/^Para Medicina:/)).toContainText('mapas do ENAMED');
    await expect(page.getByText(/^Para Medicina:/)).not.toContainText('já no ar');
  });

  test('FAQ starts with "O Remoa é só para Medicina?" and no question bank is mentioned', async ({ page }) => {
    await gotoLanding(page, '/');
    await expect(page.locator('#faq').getByRole('button').first()).toContainText('O Remoa é só para Medicina?');
    expect((await page.locator('main').innerText()).toLowerCase()).not.toContain('banco de quest');
  });
});
