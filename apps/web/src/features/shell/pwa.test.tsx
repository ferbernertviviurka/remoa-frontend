import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { countSession, Pwa } from './pwa';

vi.mock('@/lib/analytics', () => ({ track: () => undefined }));
vi.mock('@/features/challenge/client', () => ({ flushOffline: () => Promise.resolve() }));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function offerInstall() {
  const prompt = vi.fn();
  const event = new Event('beforeinstallprompt', { cancelable: true });
  Object.assign(event, { prompt });
  window.dispatchEvent(event);
  return prompt;
}

describe('install banner', () => {
  it('keeps the browser prompt until two sessions are finished', async () => {
    render(<Pwa />);
    offerInstall();
    expect(screen.queryByText('Instalar o Remoa')).toBeNull();
    countSession();
    expect(screen.queryByText('Instalar o Remoa')).toBeNull();
    countSession();
    expect(await screen.findByText('Instalar o Remoa')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Instalar' })).toBeVisible();
  });

  it('shows the banner at once when two sessions were already finished', async () => {
    localStorage.setItem('remoa-sessions', '2');
    render(<Pwa />);
    offerInstall();
    expect(await screen.findByText('Instalar o Remoa')).toBeVisible();
  });
});
