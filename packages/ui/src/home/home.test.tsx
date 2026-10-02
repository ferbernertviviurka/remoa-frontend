import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { sepsePreview } from '../fixtures-v2';
import { violations } from '../test-utils';
import { LockedSlideCard } from './locked-slide-card';
import { MapSlideCard } from './map-slide-card';
import { NewMapSlideCard } from './new-map-slide-card';
import { SliderArrows } from './slider-arrows';

const counts = { review: 2, watch: 2, steady: 1, unknown: 1 };

describe('cartões do carrossel', () => {
  it('MapSlideCard: link, 312 px e textos', () => {
    render(<MapSlideCard href="/mapas/1" aria-label="Abrir o mapa Sepse" area="Clínica Médica" title="Sepse" preview={sepsePreview} counts={counts} stateBarLabel="2 para revisitar" meta="6 cards · 6 conexões" due={{ text: '2 vencem hoje', tone: 'review' }} />);
    const a = screen.getByRole('link', { name: 'Abrir o mapa Sepse' });
    expect(a).toHaveAttribute('href', '/mapas/1');
    expect(a).toHaveClass('h-[312px]');
    expect(screen.getByText('2 vencem hoje')).toBeInTheDocument();
  });
  it('aceita o link do app (as)', () => {
    const L = ({ href, children, className, ...r }: { href: string; children?: React.ReactNode; className?: string; 'aria-label'?: string }) => <a data-pending href={href} className={className} {...r}>{children}</a>;
    const { container } = render(<NewMapSlideCard as={L} href="/mapas/novo" aria-label="Criar um novo mapa" title="Novo mapa" text="Comece do zero" />);
    expect(container.querySelector('[data-pending]')).toHaveAttribute('href', '/mapas/novo');
    expect(screen.getByRole('link', { name: 'Criar um novo mapa' })).toHaveClass('h-[312px]', 'border-dashed');
  });
  it('LockedSlideCard: CTA e 312 px; axe', async () => {
    const { container } = render(<><LockedSlideCard title="Limite do plano Free" text="O Free permite até 2 mapas." cta={<a href="/conta">Fazer upgrade</a>} />
      <MapSlideCard href="/m" aria-label="Abrir o mapa X" area="A" title="X" preview={sepsePreview} counts={counts} stateBarLabel="barra" meta="m" due={{ text: 'Em dia', tone: 'unknown' }} /></>);
    expect(screen.getByRole('link', { name: 'Fazer upgrade' })).toBeInTheDocument();
    expect(screen.getByText('Limite do plano Free').parentElement?.parentElement).toHaveClass('h-[312px]');
    expect(await violations(container)).toEqual([]);
  });
});

describe('LockedSlideCard layout', () => {
  it('texto longo: 312 px, texto limitado a 2 linhas e CTA colado no fundo', () => {
    const long = 'O Free permite até 2 mapas. Faça upgrade para criar o próximo e muito mais texto para quebrar em várias linhas.';
    render(<LockedSlideCard title="Limite do plano Free" text={long} cta={<a href="/conta">Fazer upgrade</a>} />);
    const text = screen.getByText(long);
    expect(text).toHaveClass('line-clamp-2', 'min-w-0');
    expect(text).toHaveAttribute('title', long);
    const cta = screen.getByRole('link', { name: 'Fazer upgrade' }).parentElement;
    expect(cta).toHaveClass('mt-auto', 'w-full');
    expect(text.parentElement?.parentElement).toHaveClass('h-[312px]', 'flex-col');
  });
});

describe('SliderArrows', () => {
  const base = { prevLabel: 'Mapas anteriores', nextLabel: 'Próximos mapas' };
  it('desabilitado de verdade, sem clique', async () => {
    const onPrev = vi.fn(); const onNext = vi.fn();
    render(<SliderArrows {...base} onPrev={onPrev} onNext={onNext} prevDisabled counter="1–3 de 6" />);
    const prev = screen.getByRole('button', { name: 'Mapas anteriores' });
    expect(prev).toBeDisabled();
    expect(prev).toHaveClass('disabled:opacity-40', 'size-11');
    await userEvent.click(prev);
    expect(onPrev).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Próximos mapas' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.getByText('1–3 de 6')).toBeInTheDocument();
  });
  it('sem contador e sem axe', async () => {
    const { container } = render(<SliderArrows {...base} onPrev={() => undefined} onNext={() => undefined} nextDisabled />);
    expect(screen.queryByText(/ de /)).toBeNull();
    expect(screen.getByRole('button', { name: 'Próximos mapas' })).toBeDisabled();
    expect(await violations(container)).toEqual([]);
  });
});
