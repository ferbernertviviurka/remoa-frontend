import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { reviewQueueFixture } from '@remoa/contracts/mocks';
import { ChallengeProvider } from '@/features/challenge/provider';
import { rememberQueue } from './queue-cache';
import { SavedQueueView } from './saved-queue';

vi.mock('@/lib/analytics', () => ({ track: () => undefined }));
vi.mock('next/navigation', () => ({ usePathname: () => '/app/revisar', useRouter: () => ({ push: () => undefined }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/api', () => ({ api: () => Promise.resolve({ ok: false, error: { code: 'internal', message: 'network' } }) }));

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(globalThis, 'caches');
});

describe('SavedQueueView', () => {
  it('shows the last queue stored on the device when the server could not load one', async () => {
    installCache();
    const boardId = reviewQueueFixture[0]!.boardId;
    await rememberQueue({ items: reviewQueueFixture, boardTitles: { [boardId]: 'Sepse' } });
    render(<ChallengeProvider><SavedQueueView message="Sem conexão" /></ChallengeProvider>);
    expect(await screen.findByText('Esta é a última fila salva neste aparelho. A correção por IA volta quando a rede voltar.')).toBeVisible();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sepse');
    expect(screen.getByRole('button', { name: 'Começar revisão' })).toBeVisible();
  });

  it('keeps the server message when nothing was saved', async () => {
    installCache();
    render(<ChallengeProvider><SavedQueueView message="Sem conexão" /></ChallengeProvider>);
    expect(await screen.findByText('Sem conexão')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Começar revisão' })).toBeNull();
  });
});

function installCache() {
  let body: string | undefined;
  globalThis.caches = {
    open: async () => ({
      put: async (_key: string, response: Response) => {
        body = await response.text();
      },
      match: async () => (body === undefined ? undefined : new Response(body)),
    }),
  } as unknown as CacheStorage;
}
