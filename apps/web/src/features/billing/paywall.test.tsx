import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PLAN_LIMITS } from '@remoa/contracts';
import { Paywall, paywallFromError, PaywallProvider, usePaywall } from './paywall';

const push = vi.fn();
const track = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('paywallFromError', () => {
  it('maps quota keys to reasons and ignores other errors', () => {
    expect(paywallFromError({ code: 'quota_exceeded', message: 'ai_grades' })).toBe('ai_quota');
    expect(paywallFromError({ code: 'quota_exceeded', message: 'ai_generations' })).toBe('pdf');
    expect(paywallFromError({ code: 'quota_exceeded', message: 'boards' })).toBe('boards');
    expect(paywallFromError({ code: 'quota_exceeded', message: 'cards' })).toBe('cards');
    expect(paywallFromError({ code: 'internal', message: 'x' })).toBeNull();
  });
});

describe('Paywall', () => {
  it('shows the message of the reason with the plan limit and fires paywall_viewed', () => {
    render(<Paywall reason="boards" onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveTextContent(`limite de ${PLAN_LIMITS.free.limits.boards} mapas`);
    expect(track).toHaveBeenCalledWith('paywall_viewed', { reason: 'boards' });
  });

  it('CTA goes to /precos; "Continuar no Free" only closes', () => {
    const onClose = vi.fn();
    render(<Paywall reason="cards" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar no Free' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Assinar o Pro' }));
    expect(push).toHaveBeenCalledWith('/precos');
  });

  it('provider opens on a 402 error and closes on dismiss', () => {
    function Probe() {
      const p = usePaywall();
      return <button onClick={() => p.handle({ code: 'quota_exceeded', message: 'ai_generations' })}>go</button>;
    }
    render(<PaywallProvider><Probe /></PaywallProvider>);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByRole('dialog')).toHaveTextContent('geração de mapa por PDF');
    expect(track).toHaveBeenCalledWith('paywall_viewed', { reason: 'pdf' });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar no Free' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
