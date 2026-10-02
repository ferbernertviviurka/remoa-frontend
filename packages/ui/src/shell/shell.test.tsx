import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { vi } from 'vitest';
import { AppNavbar } from './app-navbar';
import { LimitMeter, meterTone } from './limit-meter';
import { PlanChip } from './plan-chip';
import { PlanPopover } from './plan-popover';
import { violations } from '../test-utils';

const setHover = (matches: boolean) => {
  window.matchMedia = ((q: string) => ({ matches, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
};

describe('meterTone', () => {
  it.each([
    [0, 2, 'ok'], [1, 2, 'ok'], [79, 100, 'ok'], [80, 100, 'warn'], [99, 100, 'warn'], [2, 2, 'full'], [3, 2, 'full'], [5, null, 'unlimited'], [0, 0, 'full'],
  ] as const)('%s de %s = %s', (used, limit, tone) => expect(meterTone(used, limit)).toBe(tone));
});

describe('LimitMeter', () => {
  it('largura e tom', () => {
    const { rerender } = render(<LimitMeter label="Mapas" value="1 de 2" used={1} limit={2} />);
    expect(screen.getByTestId('meter-fill')).toHaveStyle({ width: '50%' });
    rerender(<LimitMeter label="Mapas" value="2 de 2" used={2} limit={2} />);
    expect(screen.getByTestId('meter-fill').className).toContain('bg-review');
    rerender(<LimitMeter label="Cards" value="Ilimitados" used={9} limit={null} />);
    expect(screen.getByTestId('meter-fill')).toHaveStyle({ width: '100%' });
  });
});

const meters = [
  { label: 'Mapas', value: '1 de 2', used: 1, limit: 2 },
  { label: 'Cards', value: '10 de 200', used: 10, limit: 200 },
];
function Pop(props: { onOpenChange?: (o: boolean, t: string) => void; state?: 'ready' | 'loading' | 'error'; onRetry?: () => void }) {
  return (
    <div>
      <button type="button">fora</button>
      <PlanPopover
        trigger={<PlanChip plan="free">Plano Free</PlanChip>}
        label="Seu plano"
        title="Você está no plano Free"
        text="Texto"
        meters={meters}
        benefits={{ title: 'Com o Pro você ganha', items: [{ icon: 'sparkle', lead: 'IA', text: 'sem limite' }] }}
        cta={<a href="/conta">Fazer upgrade</a>}
        state={props.state}
        loadingLabel="Carregando"
        error={{ message: 'Falhou', retryLabel: 'Tentar de novo', onRetry: props.onRetry ?? (() => undefined) }}
        onOpenChange={props.onOpenChange}
      />
    </div>
  );
}
const wait = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));
const chip = () => screen.getByRole('button', { name: /Plano Free/ });

describe('PlanPopover', () => {
  beforeEach(() => setHover(true));
  const user = () => userEvent.setup({ delay: null });

  it('hover abre após 120 ms e fecha 200 ms depois de sair', async () => {
    const onOpenChange = vi.fn();
    render(<Pop onOpenChange={onOpenChange} />);
    const u = user();
    await u.hover(chip());
    await wait(60);
    expect(screen.queryByRole('dialog')).toBeNull();
    await wait(120);
    expect(screen.getByRole('dialog', { name: 'Seu plano' })).toBeInTheDocument();
    expect(chip()).toHaveAttribute('aria-expanded', 'true');
    expect(chip()).toHaveAttribute('aria-controls', screen.getByRole('dialog').id);
    expect(onOpenChange).toHaveBeenCalledWith(true, 'hover');
    await u.unhover(chip());
    await wait(100);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await wait(200);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('atravessar do chip para o painel não fecha', async () => {
    render(<Pop />);
    const u = user();
    await u.hover(chip());
    await wait(130);
    await u.unhover(chip());
    await u.hover(screen.getByRole('dialog'));
    await wait(500);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('sem (hover: hover) o hover não faz nada', async () => {
    setHover(false);
    render(<Pop />);
    await user().hover(chip());
    await wait(500);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clique fixa: sair com o mouse não fecha; novo clique fecha', async () => {
    const onOpenChange = vi.fn();
    render(<Pop onOpenChange={onOpenChange} />);
    const u = user();
    await u.click(chip());
    expect(onOpenChange).toHaveBeenCalledWith(true, 'click');
    await u.unhover(chip());
    await wait(600);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await u.click(chip());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clique após abrir por hover fixa em vez de fechar', async () => {
    render(<Pop />);
    const u = user();
    await u.hover(chip());
    await wait(130);
    await u.click(chip());
    await u.unhover(chip());
    await wait(600);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Enter abre como keyboard e Esc fecha', async () => {
    const onOpenChange = vi.fn();
    render(<Pop onOpenChange={onOpenChange} />);
    const u = user();
    await u.tab(); await u.tab();
    expect(chip()).toHaveFocus();
    await u.keyboard('{Enter}');
    expect(onOpenChange).toHaveBeenCalledWith(true, 'keyboard');
    expect(chip()).toHaveFocus();
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false, 'keyboard');
  });

  it('clique fora fecha', async () => {
    render(<Pop />);
    const u = user();
    await u.click(chip());
    await u.click(screen.getByRole('button', { name: 'fora' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Tab entra no painel; sair do foco fecha só quando não fixado', async () => {
    render(<Pop />);
    const u = user();
    await u.hover(chip());
    await wait(130);
    chip().focus();
    await u.tab();
    expect(screen.getByRole('link', { name: 'Fazer upgrade' })).toHaveFocus();
    act(() => { screen.getByRole('button', { name: 'fora' }).focus(); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('fixado: foco fora não fecha', async () => {
    render(<Pop />);
    const u = user();
    await u.click(chip());
    act(() => { screen.getByRole('button', { name: 'fora' }).focus(); });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('loading e error', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<Pop state="loading" />);
    const u = user();
    await u.click(chip());
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
    expect(screen.queryByText('Mapas')).toBeNull();
    rerender(<Pop state="error" onRetry={onRetry} />);
    await u.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('sem violações axe', async () => {
    const { baseElement } = render(<Pop />);
    fireEvent.click(chip());
    expect(await violations(baseElement)).toEqual([]);
  });
});

describe('AppNavbar', () => {
  it('link da marca e slots', async () => {
    const { container } = render(<AppNavbar home={{ href: '/', label: 'Remoa, ir para Hoje' }} chip={<PlanChip plan="pro">Plano Pro</PlanChip>} actions={<button type="button">Ação</button>} />);
    expect(screen.getByRole('link', { name: 'Remoa, ir para Hoje' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: /Plano Pro/ })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveClass('h-16');
    expect(await violations(container)).toEqual([]);
  });
});

describe('movimento reduzido', () => {
  it('motion.css desliga animações com data-motion=reduced e prefers-reduced-motion', () => {
    const css = readFileSync('src/motion.css', 'utf8');
    expect(css).toMatch(/\[data-motion='reduced'\][\s\S]*animation: none !important/);
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*:root:not\(\[data-motion\]\)/);
  });
  it('painel e barras usam as classes governadas por motion.css', () => {
    render(<LimitMeter label="a" value="b" used={1} limit={2} />);
    expect(screen.getByTestId('meter-fill')).toHaveClass('fillx');
  });
});
