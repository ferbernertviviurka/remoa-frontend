import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { violations } from '../test-utils';
import { RingProgress, SegmentBar, ColumnChart, Donut, LineChart, Heatmap, KpiCard, ToggleChip, SwitchRow } from './index';
import { forecast, retention, activity } from './fixtures';

const states = [
  { id: 'due', label: 'Vencidos', value: 12, color: 'var(--state-review-border)' },
  { id: 'watch', label: 'Em atenção', value: 5, color: 'var(--state-watch-border)' },
  { id: 'steady', label: 'Firmes', value: 30, color: 'var(--primary)' },
];

describe('RingProgress / SegmentBar', () => {
  it('ring is an image with the summary and final dash offset inline', async () => {
    const { container } = render(<RingProgress value={3} max={12} label="3 de 12 revisados hoje">3</RingProgress>);
    expect(screen.getByRole('img', { name: '3 de 12 revisados hoje' })).toBeTruthy();
    const arc = screen.getByTestId('ring-progress-arc') as unknown as SVGElement;
    const C = 2 * Math.PI * 100;
    expect(Number.parseFloat(arc.style.strokeDashoffset)).toBeCloseTo(C * 0.75, 0);
    expect(await violations(container)).toEqual([]);
  });
  it('ring with zero progress draws no arc; bar skips empty segments', () => {
    render(<><RingProgress value={0} max={5} label="x" /><SegmentBar summary="barra" segments={[{ id: 'a', value: 2, color: 'red' }, { id: 'b', value: 0, color: 'blue' }]} /></>);
    expect(screen.queryByTestId('ring-progress-arc')).toBeNull();
    expect(screen.getByRole('img', { name: 'barra' }).children).toHaveLength(1);
  });
});

describe('ColumnChart', () => {
  const props = { items: forecast, summary: 'Previsão: pico de 22 cards', valueLabel: (i: { value: number }) => `${i.value} cards`, tableHeaders: ['Dia', 'Cards'] as [string, string] };
  it('names bars, shows tooltip on focus, and exposes a table', async () => {
    const { container } = render(<ColumnChart {...props} tableToggleLabel="Ver como tabela" />);
    expect(screen.getByRole('figure', { name: props.summary })).toBeTruthy();
    const bar = screen.getByRole('button', { name: '12 cards, 1 de out' });
    expect(screen.queryByText('1 de out', { selector: 'span[role=presentation]' })).toBeNull();
    await userEvent.tab(); // first Tab stop is the first bar
    expect(document.activeElement).toBe(bar);
    expect(container.querySelector('[role=presentation]')?.textContent).toContain('12 cards');
    expect(screen.getByRole('table')).toBeTruthy();
    expect(await violations(container)).toEqual([]);
  });
  it('toggle reveals the table (aria-expanded)', async () => {
    render(<ColumnChart {...props} tableToggleLabel="Ver como tabela" />);
    const t = screen.getByRole('button', { name: 'Ver como tabela' });
    expect(t.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(t);
    expect(t.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('table').className).not.toContain('sr-only');
  });
  it('rounds axis to a multiple of 5 and shows empty text', () => {
    render(<ColumnChart {...props} items={forecast.map((i) => ({ ...i, value: 0 }))} emptyText="Nada previsto" />);
    expect(screen.getByText('Nada previsto')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });
});

describe('Donut', () => {
  const props = { segments: states, summary: 'Estado dos cards', totalLabel: 'cards', tableHeaders: ['Estado', 'Cards'] as [string, string] };
  it('swaps the center on legend focus and dims other segments', async () => {
    const { container } = render(<Donut {...props} />);
    expect(screen.getByText('47')).toBeTruthy();
    await userEvent.tab();
    expect(screen.getAllByText('Vencidos').length).toBeGreaterThan(0);
    expect(screen.getByText('12', { selector: 'span.font-display' })).toBeTruthy();
    expect((container.querySelector('[data-segment=steady]') as SVGElement).style.opacity).toBe('0.2');
    expect(await violations(container)).toEqual([]);
  });
  it('total 0 shows only the track and the empty text', () => {
    const { container } = render(<Donut {...props} segments={states.map((s) => ({ ...s, value: 0 }))} emptyText="Sem cards" />);
    expect(container.querySelectorAll('[data-segment]')).toHaveLength(0);
    expect(screen.getByText('Sem cards')).toBeTruthy();
  });
});

describe('LineChart', () => {
  const props = { points: retention, summary: 'Retenção média 85%', valueLabel: (p: { value: number }) => `${p.value}%`, tableHeaders: ['Data', 'Retenção'] as [string, string], fromLabel: 'há 30 dias', toLabel: 'hoje', target: { value: 90, label: '90%' }, yTicks: [0, 50, 100], formatTick: (v: number) => `${v}%` };
  it('roving focus: one tab stop, arrows move, guide + tip appear', async () => {
    const { container } = render(<LineChart {...props} />);
    const cols = screen.getAllByRole('button');
    expect(cols.filter((c) => c.tabIndex === 0)).toHaveLength(1);
    await userEvent.tab();
    expect(document.activeElement).toBe(cols[0]);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(document.activeElement).toBe(cols[2]);
    expect(container.querySelector('[role=presentation]')?.textContent).toContain(`${retention[2]?.value}%`);
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(cols[29]);
    expect(await violations(container)).toEqual([]);
  });
  it('empty: no path, shows empty text', () => {
    render(<LineChart {...props} points={[]} emptyText="Sem histórico" />);
    expect(screen.queryByTestId('line-path')).toBeNull();
    expect(screen.getByText('Sem histórico')).toBeTruthy();
  });
});

describe('Heatmap', () => {
  const props = { cells: activity, summary: 'Atividade de 15 semanas', idleCaption: 'Passe o mouse', lessLabel: 'menos', moreLabel: 'mais', tableHeaders: ['Dia', 'Atividade'] as [string, string] };
  it('has 99 focusable cells (future excluded), one tab stop, 2D arrows and caption', async () => {
    const { container } = render(<Heatmap {...props} />);
    const cells = screen.getAllByRole('button');
    expect(cells).toHaveLength(99);
    expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1);
    expect(container.querySelectorAll('[aria-hidden=true][class*=border-dashed]')).toHaveLength(6);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(cells[1]);
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(cells[8]);
    expect(screen.getByRole('status').textContent).toBe(activity[8]?.label);
    fireEvent.blur(cells[8] as HTMLElement);
    expect(screen.getByRole('status').textContent).toBe('Passe o mouse');
    expect(await violations(container)).toEqual([]);
  });
});

describe('KpiCard / ToggleChip / SwitchRow', () => {
  it('KpiCard renders value, dots and bar with names', async () => {
    const { container } = render(<KpiCard label="Sequência" value="12" unit="dias" sub="Recorde: 20" dots={[{ label: 'S', on: true }, { label: 'T', on: false }]} extraLabel="Dias da semana" />);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Dias da semana' })).toBeTruthy();
    expect(await violations(container)).toEqual([]);
  });
  it('KpiCard bar has target mark', () => {
    render(<KpiCard label="Retenção" value="91" bar={{ pct: 91, target: 90 }} extraLabel="91% (meta 90%)" />);
    expect(screen.getByRole('img', { name: '91% (meta 90%)' })).toBeTruthy();
  });
  it('ToggleChip toggles aria-pressed via click and keyboard', async () => {
    const fn = vi.fn();
    render(<div role="group" aria-label="Fila"><ToggleChip pressed={false} onPressedChange={fn} title="Vencidos" sub="hoje" count={12} /></div>);
    const b = screen.getByRole('button', { name: /Vencidos/ });
    expect(b.getAttribute('aria-pressed')).toBe('false');
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(fn).toHaveBeenCalledWith(true);
  });
  it('SwitchRow is a switch with aria-checked', async () => {
    const fn = vi.fn();
    const { container } = render(<SwitchRow checked onCheckedChange={fn} title="Cardiologia" sub="Clínica" chip="12 + 3" />);
    const s = screen.getByRole('switch', { name: /Cardiologia/ });
    expect(s.getAttribute('aria-checked')).toBe('true');
    await userEvent.click(s);
    expect(fn).toHaveBeenCalledWith(false);
    expect(await violations(container)).toEqual([]);
  });
});

describe('reduced motion', () => {
  const css = readFileSync(`${process.cwd()}/src/motion.css`, 'utf8');
  it('rv-* keyframes only declare `from` (final state = element style) and use allowed properties', () => {
    const blocks = [...css.matchAll(/@keyframes (rv-[\w-]+) \{([^]*?)\}\s*(?=@|\.|$)/g)];
    expect(blocks.length).toBeGreaterThanOrEqual(5);
    for (const [, name, body] of blocks) {
      expect(body, name).not.toMatch(/\bto\s*\{/);
      expect(body, name).toMatch(/^\s*from\s*\{\s*(opacity|transform|stroke-dashoffset)/);
    }
  });
  it('global reduced-motion rules cancel animation for data-motion and prefers-reduced-motion', () => {
    expect(css).toContain("[data-motion='reduced']");
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
});
