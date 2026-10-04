// G02 / QA2: o que os specs existentes ainda não cobrem dos 10 pontos (conexões: map.spec; imagem da pergunta no nó e losango: cards.spec;
// blur/baselines: visual.spec; responsivo sem overflow: responsive.spec). Aqui: pinça, skeleton, painel, formatos + verso, motion, desafio e axe.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { createMockSepse, signUpAndLogin } from './visual/fixture';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const node = (page: Page, title: string) => page.locator('.react-flow__node').filter({ has: page.getByRole('button', { name: `Selecionar ${title}` }) });
const panel = (page: Page) => page.getByRole('complementary', { name: 'Painel do mapa' });
const zoomOf = (page: Page) => page.locator('.react-flow__viewport').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
const pageScale = (page: Page) => page.evaluate(() => ({ vv: window.visualViewport?.scale ?? 1, iw: window.innerWidth }));
const axe = async (page: Page) => {
  await page.waitForTimeout(700); // axe lê opacidade no meio de transições (flip 400 ms)
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};

const SHAPES = [['Rect', 'rect', 0], ['Pílula', 'pill', 1], ['Círculo', 'circle', 2], ['Losango', 'diamond', 3], ['Hexágono', 'hexagon', 4]] as const;

/** Board with one concept card per shape; the back of each is "Verso <title>". */
async function shapesBoard(request: APIRequestContext, headers: { authorization: string }) {
  const call = async (path: string, method: 'POST' | 'PUT', data: unknown) => {
    const r = await request.fetch(`${API}${path}`, { method, headers, data });
    expect(r.ok(), `${path} ${r.status()}`).toBeTruthy();
    return (await r.json()).data;
  };
  const board = (await call('/v1/boards', 'POST', { title: 'Formatos' })).id as string;
  const ids = SHAPES.map(() => crypto.randomUUID());
  await call('/v1/boards/ops', 'POST', { ops: SHAPES.map(([title, , i]) => ({ op: 'createCard', opId: crypto.randomUUID(), boardId: board, card: { id: ids[i], type: 'concept', title, position: { x: 80 + (i % 3) * 360, y: 140 + Math.floor(i / 3) * 320 } } })) });
  for (const [title, shape, i] of SHAPES) await call(`/v1/cards/${ids[i]}`, 'PUT', { title, type: 'concept', front: `Pergunta ${title}`, back: `Verso ${title}`, source: null, payload: {}, shape });
  return board;
}

async function pinchCdp(page: Page, x: number, y: number, scaleFactor: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.synthesizePinchGesture', { x, y, scaleFactor, relativeSpeed: 400, gestureSourceType: 'touch' });
}

test.describe('desktop 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

  test('3 pinça (ctrl+wheel) muda a escala do mapa, também sobre as peças flutuantes, e a página não dá zoom', async ({ page, request }) => {
    test.setTimeout(120_000);
    const { userId, headers } = await signUpAndLogin(page, request);
    const board = await createMockSepse(request, headers, userId);
    await page.goto(`/app/mapas/${board}`);
    await expect(page.locator('.react-flow__node')).toHaveCount(6);
    await page.waitForTimeout(800); // fitView
    const z0 = await zoomOf(page);
    const before = await pageScale(page);

    // over the pane (React Flow's own handler)
    const pane = (await page.locator('.react-flow__pane').boundingBox())!;
    await page.mouse.move(pane.x + pane.width / 2, pane.y + pane.height - 60);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -300);
    await page.keyboard.up('Control');
    await expect.poll(() => zoomOf(page)).toBeGreaterThan(z0 + 0.05);
    const z1 = await zoomOf(page);

    // over a floating piece (outside .react-flow): the editor's own listener must cancel it and zoom
    const r = await page.getByRole('group', { name: /Controles de zoom|Zoom/ }).first().evaluate((el) => {
      const ev = new WheelEvent('wheel', { ctrlKey: true, deltaY: 300, bubbles: true, cancelable: true, clientX: 700, clientY: 880 });
      el.dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    expect(r, 'ctrl+wheel sobre a barra de zoom não pode virar zoom da página').toBe(true);
    await expect.poll(() => zoomOf(page)).toBeLessThan(z1 - 0.05);
    expect(await pageScale(page)).toEqual(before);
    const z = await zoomOf(page);
    expect(z).toBeGreaterThanOrEqual(0.1 - 0.001);
    expect(z).toBeLessThanOrEqual(1.4 + 0.001);
  });

  test('4 skeleton do editor aparece no clique do MapTile, antes do canvas', async ({ page, request }) => {
    test.setTimeout(120_000);
    const { userId, headers } = await signUpAndLogin(page, request);
    await createMockSepse(request, headers, userId);
    await page.goto('/app/mapas');
    const link = page.getByRole('link', { name: 'Sepse' }).first();
    await expect(link).toBeVisible();
    await page.waitForLoadState('networkidle');
    // records the order of events from the click: skeleton (role=status aria-busy) first, canvas later
    await page.evaluate(() => {
      const w = window as unknown as { __seq: string[] };
      w.__seq = [];
      new MutationObserver(() => {
        const sk = document.querySelector('[role="status"][aria-busy="true"]') && !document.querySelector('.react-flow');
        const cv = document.querySelector('.react-flow__pane');
        if (sk && !w.__seq.includes('skeleton')) w.__seq.push('skeleton');
        if (cv && !w.__seq.includes('canvas')) w.__seq.push('canvas');
      }).observe(document.body, { childList: true, subtree: true });
    });
    // the route answers late (RSC fetch of the editor): what the student sees meanwhile must be the skeleton, not the old page or a blank frame
    await page.route(/\/mapas\/[0-9a-f-]{36}/, async (route) => {
      await new Promise((r) => setTimeout(r, 700));
      await route.continue();
    });
    await link.click();
    await expect(page.locator('[role="status"][aria-busy="true"]').first()).toBeVisible({ timeout: 600 });
    await expect(page.locator('.react-flow__pane')).toBeVisible();
    const seq = await page.evaluate(() => (window as unknown as { __seq: string[] }).__seq);
    expect(seq, 'skeleton antes do canvas').toEqual(['skeleton', 'canvas']);
  });

  test('6 painel: ausente sem seleção; aparece ao selecionar; Esc e clique no fundo fecham', async ({ page, request }) => {
    test.setTimeout(120_000);
    const { userId, headers } = await signUpAndLogin(page, request);
    const board = await createMockSepse(request, headers, userId);
    await page.goto(`/app/mapas/${board}`);
    await expect(page.locator('.react-flow__node')).toHaveCount(6);
    await expect(panel(page)).toHaveCount(0);
    await node(page, 'Choque séptico').getByRole('button', { name: 'Selecionar Choque séptico' }).click();
    await expect(panel(page).getByRole('heading', { level: 2, name: 'Choque séptico' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
    await node(page, 'Triagem').getByRole('button', { name: 'Selecionar Triagem' }).click();
    await expect(panel(page)).toBeVisible();
    // a free spot of the pane (clear of cards, the layer bar, the zoom/toolbar and the panel)
    const pt = (await page.evaluate(() => {
      for (let y = 160; y < 700; y += 20) for (let x = 400; x < 900; x += 20) if (document.elementFromPoint(x, y)?.classList.contains('react-flow__pane')) return { x, y };
      return null;
    }))!;
    await page.mouse.click(pt.x, pt.y);
    await expect(panel(page)).toHaveCount(0);
  });

  test('8/9 formatos: título legível, "Ver resposta" dentro do nó, virar mostra o verso e volta sem abrir o painel; axe', async ({ page, request }) => {
    test.setTimeout(180_000);
    const { headers } = await signUpAndLogin(page, request);
    const board = await shapesBoard(request, headers);
    await page.goto(`/app/mapas/${board}`);
    await expect(page.locator('.react-flow__node')).toHaveCount(5);
    await page.waitForTimeout(800);
    for (const [title, shape] of SHAPES) {
      const n = node(page, title);
      await expect(n.locator('article')).toHaveAttribute('data-shape', shape);
      await expect(n.getByText(title, { exact: true }).first()).toBeVisible();
      const flip = n.getByRole('button', { name: 'Ver resposta' });
      const nb = (await n.locator('article').boundingBox())!;
      const fb = (await flip.boundingBox())!;
      expect(fb.x, `${shape}: botão à esquerda do nó`).toBeGreaterThanOrEqual(nb.x - 1);
      expect(fb.y, `${shape}: botão acima do nó`).toBeGreaterThanOrEqual(nb.y - 1);
      expect(fb.x + fb.width, `${shape}: botão à direita do nó`).toBeLessThanOrEqual(nb.x + nb.width + 1);
      expect(fb.y + fb.height, `${shape}: botão abaixo do nó`).toBeLessThanOrEqual(nb.y + nb.height + 1);
      await expect(n).not.toContainText(`Verso ${title}`); // answer is not in the DOM on the front
    }
    expect(await axe(page), 'editor com formatos').toEqual([]);

    const hex = node(page, 'Hexágono');
    await hex.getByRole('button', { name: 'Ver resposta' }).click();
    await expect(hex.locator('article')).toHaveAttribute('data-flipped', 'true');
    await expect(hex).toContainText('Verso Hexágono');
    await expect(panel(page)).toHaveCount(0); // flipping is local: it does not select
    expect(await axe(page), 'editor com card virado').toEqual([]);
    await hex.getByRole('button', { name: 'Ver pergunta' }).click();
    await expect(hex.locator('article')).not.toHaveAttribute('data-flipped', 'true');
    await expect(hex).not.toContainText('Verso Hexágono');
    await expect(panel(page)).toHaveCount(0);

    // card editor with the shape picker and the question image (7/8)
    await node(page, 'Rect').getByRole('button', { name: 'Selecionar Rect' }).click();
    await panel(page).getByRole('button', { name: 'Mais ações de Rect' }).click();
    await page.getByRole('menuitem', { name: 'Editar card' }).click();
    const form = panel(page).getByRole('form');
    await expect(form.getByRole('group', { name: 'Formato no mapa' })).toBeVisible();
    const b64 = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 400; c.height = 300;
      const g = c.getContext('2d')!;
      g.fillStyle = '#e0f2fe'; g.fillRect(0, 0, 400, 300);
      return c.toDataURL('image/png').split(',')[1]!;
    });
    await form.getByRole('group', { name: 'Imagem da pergunta (opcional)' }).locator('input[type="file"]').setInputFiles({ name: 'q.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
    await expect(form.getByRole('img', { name: 'Imagem da pergunta de Rect' })).toBeVisible({ timeout: 30_000 });
    expect(await axe(page), 'editor de card: formato + imagem da pergunta').toEqual([]);
  });

  test('9 sem animação com prefers-reduced-motion; com animação por padrão', async ({ browser, request }) => {
    test.setTimeout(150_000);
    const dur = async (reducedMotion: 'reduce' | 'no-preference') => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion });
      const page = await ctx.newPage();
      try {
        const { headers } = await signUpAndLogin(page, request);
        await page.goto(`/app/mapas/${await shapesBoard(request, headers)}`);
        await expect(page.locator('.react-flow__node')).toHaveCount(5);
        const n = node(page, 'Rect');
        await n.getByRole('button', { name: 'Ver resposta' }).click();
        await expect(n.locator('article')).toHaveAttribute('data-flipped', 'true');
        return await n.locator('.cv-flip').evaluate((el) => getComputedStyle(el).transitionDuration);
      } finally {
        await ctx.close();
      }
    };
    expect(await dur('reduce')).toBe('0s');
    expect(await dur('no-preference')).toBe('0.4s');
  });

  test('10 desafio: viewport desfocado, só o card em foco nítido (só a frente), nenhuma resposta no DOM antes do /answer; axe', async ({ page, request }) => {
    test.setTimeout(240_000);
    const { userId, headers } = await signUpAndLogin(page, request);
    const board = await createMockSepse(request, headers, userId);
    await page.goto(`/app/mapas/${board}?modo=desafio`);
    await expect(page.getByRole('button', { name: /Revelar resposta|Corrigir resposta/ }).first()).toBeVisible();
    const answers = ['Vasopressor para PAM', 'Disfunção orgânica grave', 'SIRS, NEWS2']; // case stages before the hidden one are context, not asserted
    // next_step: the steps before the hidden one are context; at least one of the 5 must be missing from the DOM
    const steps = ['Dosar lactato', 'Hemoculturas antes do ATB', 'ATB de amplo espectro', 'Cristaloide 30 mL/kg', 'Noradrenalina se PAM < 65'];
    const labels = ['suspeita', 'treina', 'evolui para', 'positiva', 'PAM < 65', 'foco'];
    let sawEdge = false;

    for (let n = 0; n < 8; n++) {
      const summary = page.getByRole('heading', { name: 'Sessão concluída' });
      const reveal = page.getByRole('button', { name: 'Revelar resposta' });
      await expect(summary.or(reveal.first())).toBeVisible();
      if (await summary.isVisible()) break;
      await page.waitForTimeout(400);

      const probe = await page.evaluate(({ answers: a, labels: l, steps: st }) => {
        const vp = document.querySelector('.react-flow__viewport')!;
        const focus = document.querySelector('[data-testid="focus-card"]');
        let blurredAncestor = false;
        for (let e: Element | null = focus; e; e = e.parentElement) if (getComputedStyle(e).filter !== 'none') blurredAncestor = true;
        // rendered/DOM text only (the hydration <script> payload carries the owner's own card data and is not the DOM the student sees)
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.parentElement?.closest('script,style,noscript') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
        let text = '';
        for (let t = w.nextNode(); t; t = w.nextNode()) text += ' ' + t.nodeValue;
        return {
          viewportFilter: getComputedStyle(vp).filter,
          hasFocus: !!focus,
          focusFlipped: !!focus?.querySelector('[data-flipped]'),
          blurredAncestor,
          leaked: a.filter((s) => text.includes(s)),
          stepsShown: st.filter((s) => text.includes(s)).length,
          labelsShown: l.filter((s) => text.includes(s)).length,
          asksEdge: /O que liga /.test(text),
        };
      }, { answers, labels, steps });
      expect(probe.viewportFilter, 'canvas desfocado').toMatch(/blur\(5px\)/);
      expect(probe.hasFocus, 'card em foco').toBe(true);
      expect(probe.blurredAncestor, 'card em foco nítido').toBe(false);
      expect(probe.focusFlipped, 'foco mostra só a frente').toBe(false);
      expect(probe.leaked, 'resposta no DOM antes de revelar').toEqual([]);
      expect(probe.stepsShown, 'passo oculto fora do DOM').toBeLessThan(steps.length);
      if (probe.asksEdge) {
        sawEdge = true;
        expect(probe.labelsShown, 'rótulo da conexão perguntada fora do DOM').toBeLessThan(labels.length);
      }
      if (n === 0) expect(await axe(page), 'desafio com blur').toEqual([]);
      await reveal.first().click();
      await expect(page.getByRole('group', { name: /^Como foi lembrar/ })).toBeVisible();
      await page.getByRole('button', { name: /^Bom/ }).click();
    }
    // the edge item is covered in challenge.spec on its own board; here it is a bonus when the mock session reaches one
    test.info().annotations.push({ type: 'edge-item-seen', description: String(sawEdge) });
  });
});

test.describe('celular 390x844 (toque)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'light' });
  // Merge main (F09 FR-2): on a phone the map is a list (map-surface.tsx), so canvas pinch/bottom sheet no longer render below 768 px.
  // Phone review is covered by mobile-review.spec.ts. Pending product call: drop these or move them to a tablet viewport.
  test.skip(true, 'F09: mapa no celular é lista, sem canvas');

  test('3 pinça por toque (CDP) começando sobre um card: a escala do mapa muda e a página não dá zoom', async ({ page, request }) => {
    test.setTimeout(120_000);
    const { userId, headers } = await signUpAndLogin(page, request);
    const board = await createMockSepse(request, headers, userId);
    await page.goto(`/app/mapas/${board}`);
    await expect(page.locator('.react-flow__node')).toHaveCount(6);
    await page.waitForTimeout(800);
    const z0 = await zoomOf(page);
    const before = await pageScale(page);
    // P-083: the pinch starts ON a card (touch screens don't drag cards, so the map zooms)
    // a card fully on screen (at the 60% floor the Sepse map is wider than 390 px since the case card grew in G06)
    const boxes = await Promise.all((await page.locator('.react-flow__node').all()).map((n) => n.boundingBox()));
    const box = boxes.find((b) => b && b.x > 0 && b.y > 0 && b.x + b.width < 390 && b.y + b.height < 760)!;
    await pinchCdp(page, box.x + box.width / 2, box.y + box.height / 2, 1.8);
    await expect.poll(() => zoomOf(page), { timeout: 5000 }).toBeGreaterThan(z0 + 0.05);
    expect(await pageScale(page)).toEqual(before);
  });

  test('1/6 painel vira bottom sheet; formatos e verso no celular; desafio com blur; axe', async ({ page, request }) => {
    test.setTimeout(240_000);
    const { userId, headers } = await signUpAndLogin(page, request);
    const board = await createMockSepse(request, headers, userId);
    await page.goto(`/app/mapas/${board}`);
    await expect(page.locator('.react-flow__node')).toHaveCount(6);
    await expect(panel(page)).toHaveCount(0);
    await node(page, 'Choque séptico').getByRole('button', { name: 'Selecionar Choque séptico' }).click();
    await expect(panel(page)).toBeVisible();
    await expect.poll(() => panel(page).evaluate((el) => el.getAnimations().every((a) => a.playState === 'finished'))).toBe(true); // G06: the sheet slides up first
    const pb = (await panel(page).boundingBox())!;
    expect(Math.abs(pb.y + pb.height - 844), 'sheet encostada embaixo').toBeLessThanOrEqual(80); // bottom-nav safe area
    expect(pb.height / 844, 'sheet ~55%').toBeGreaterThan(0.4);
    expect(pb.height / 844).toBeLessThan(0.7);
    expect(await axe(page), 'bottom sheet').toEqual([]);
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);

    await page.goto(`/app/mapas/${board}?modo=desafio`);
    await expect(page.getByRole('button', { name: /Revelar resposta|Corrigir resposta/ }).first()).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.getByTestId('focus-card')).toBeAttached();
    expect(await page.locator('.react-flow__viewport').evaluate((el) => getComputedStyle(el).filter)).toMatch(/blur/);
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollW, 'sem overflow horizontal no desafio').toBeLessThanOrEqual(390);
    expect(await axe(page), 'desafio no celular').toEqual([]);
  });
});
