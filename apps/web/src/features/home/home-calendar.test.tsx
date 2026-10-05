import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as mocks from '@remoa/contracts/mocks';
import type { UpcomingEvents } from '@remoa/contracts';
import { CalendarStrip, UpcomingCard } from './home-calendar';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));

const TZ = 'America/Sao_Paulo';
const upcoming = async (now = mocks.FIXTURE_NOW) => {
  mocks.resetCalendarMocks();
  const r = await mocks.getUpcomingEvents(mocks.fixtureUserId, 4, now);
  return (r as { ok: true; data: UpcomingEvents }).data;
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Hoje: faixa e card (FR-17)', () => {
  it('shows the amber strip for today/tomorrow, linking to the calendar', async () => {
    render(<CalendarStrip upcoming={await upcoming()} />);
    const strip = screen.getByRole('link', { name: 'Compromisso chegando' });
    expect(strip).toHaveAttribute('href', '/app/calendario');
    expect(strip).toHaveTextContent('Hoje às 19:00: Grupo de estudo');
    fireEvent.click(strip);
    expect(track).toHaveBeenCalledWith('calendar_home_card_clicked', { target: 'banner' });
  });

  it('shows no strip when the next appointment is further than tomorrow', async () => {
    const far = (await upcoming()).events.filter((e) => e.daysUntil > 1);
    const { container } = render(<CalendarStrip upcoming={{ events: far, within24h: false }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists the next appointments with the count chip, and an empty state with the add action', async () => {
    const data = await upcoming();
    render(<UpcomingCard upcoming={data} timeZone={TZ} now={mocks.FIXTURE_NOW} />);
    expect(screen.getByRole('heading', { name: 'Próximos compromissos' })).toBeInTheDocument();
    expect(screen.getByText('Prova de Clínica Médica')).toBeInTheDocument();
    expect(screen.getAllByText('Amanhã').length).toBeGreaterThan(0);
    cleanup();
    render(<UpcomingCard upcoming={{ events: [], within24h: false }} timeZone={TZ} now={mocks.FIXTURE_NOW} />);
    expect(screen.getByRole('link', { name: 'Adicionar compromisso' })).toHaveAttribute('href', '/app/calendario');
  });
});
