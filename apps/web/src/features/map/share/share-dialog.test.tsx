// F17 T7: ShareDialog tests
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { shareStateFixture, sharedBoardToken } from '@remoa/contracts/mocks';
import { ShareDialog } from './share-dialog';
import * as shareApi from './share-api';

// Torph useToast mock
vi.mock('@remoa/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@remoa/ui')>();
  return { ...actual, useToast: () => ({ toast: vi.fn() }) };
});

// analytics mock
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

const mockBoard = {
  id: 'board-1',
  access: 'owner' as const,
  shareUrl: null,
};

const mockPublicState = { ...shareStateFixture, access: 'public' as const, url: `https://app.remoa.mock/m/${sharedBoardToken}`, copies: 3 };
const mockPasswordState = { ...shareStateFixture, access: 'password' as const, url: `https://app.remoa.mock/m/${sharedBoardToken}`, copies: 1 };
const mockOwnerState = { access: 'owner' as const, url: null, copies: 0 };

function setup(open = true) {
  const onOpenChange = vi.fn();
  const utils = render(<ShareDialog board={mockBoard} open={open} onOpenChange={onOpenChange} />);
  return { ...utils, onOpenChange };
}

describe('ShareDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state while fetching share info', () => {
    vi.spyOn(shareApi, 'getShare').mockReturnValue(new Promise(() => {}));
    setup();
    expect(screen.getByRole('status', { name: /carregando/i })).toBeInTheDocument();
  });

  it('loads and shows share state for public board', async () => {
    vi.spyOn(shareApi, 'getShare').mockResolvedValue({ ok: true, data: mockPublicState });
    setup();

    await waitFor(() => {
      expect(screen.getByText(/quem tiver o link pode ver/i)).toBeInTheDocument();
    });
    // CopyField shows URL
    expect(screen.getByDisplayValue(mockPublicState.url!)).toBeInTheDocument();
    // Copies count
    expect(screen.getByText(/copiado 3 vezes/i)).toBeInTheDocument();
  });

  it('shows password field when switching to Privado', async () => {
    vi.spyOn(shareApi, 'getShare').mockResolvedValue({ ok: true, data: mockOwnerState });
    setup();

    await waitFor(() => screen.getByRole('radio', { name: /privado/i }));
    fireEvent.click(screen.getByRole('radio', { name: /privado/i }));

    expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument();
  });

  it('blocks save when switching to Privado without entering password', async () => {
    vi.spyOn(shareApi, 'getShare').mockResolvedValue({ ok: true, data: mockOwnerState });
    const updateShareSpy = vi.spyOn(shareApi, 'updateShare').mockResolvedValue({ ok: true, data: mockPasswordState });
    setup();

    await waitFor(() => screen.getByRole('radio', { name: /privado/i }));
    fireEvent.click(screen.getByRole('radio', { name: /privado/i }));
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    // updateShare should NOT be called
    expect(updateShareSpy).not.toHaveBeenCalled();
    // password error shown
    expect(screen.getByText(/obrigatória/i)).toBeInTheDocument();
  });

  it('password field is optional when board already has password access', async () => {
    vi.spyOn(shareApi, 'getShare').mockResolvedValue({ ok: true, data: mockPasswordState });
    const updateShareSpy = vi.spyOn(shareApi, 'updateShare').mockResolvedValue({ ok: true, data: mockPasswordState });
    setup();

    await waitFor(() => screen.getByText(/a senha atual não é mostrada/i));
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    // Save called without password
    await waitFor(() => expect(updateShareSpy).toHaveBeenCalledWith('board-1', expect.objectContaining({ access: 'password' })));
  });

  it('shows rotate confirmation before rotating link', async () => {
    vi.spyOn(shareApi, 'getShare').mockResolvedValue({ ok: true, data: mockPublicState });
    setup();

    const rotate = await screen.findByRole('button', { name: /gerar novo link/i });
    fireEvent.click(rotate);

    expect(screen.getByText(/o link atual vai parar de funcionar/i)).toBeInTheDocument();
  });

  it('rotates link after confirmation', async () => {
    const newUrl = `https://app.remoa.mock/m/${'B'.repeat(43)}`;
    const rotatedState = { ...mockPublicState, url: newUrl };
    vi.spyOn(shareApi, 'getShare').mockResolvedValue({ ok: true, data: mockPublicState });
    vi.spyOn(shareApi, 'updateShare').mockResolvedValue({ ok: true, data: rotatedState });
    setup();

    const rotate = await screen.findByRole('button', { name: /gerar novo link/i });
    fireEvent.click(rotate);
    const confirm = await screen.findAllByRole('button', { name: /gerar novo link/i });
    fireEvent.click(confirm[confirm.length - 1]!);

    await waitFor(() => expect(screen.getByDisplayValue(newUrl)).toBeInTheDocument());
  });

  it('shows conflict error and reloads on 409', async () => {
    vi.spyOn(shareApi, 'getShare')
      .mockResolvedValueOnce({ ok: true, data: mockOwnerState })
      .mockResolvedValueOnce({ ok: true, data: mockPublicState });
    vi.spyOn(shareApi, 'updateShare').mockResolvedValue({ ok: false, error: { code: 'conflict', message: 'conflict' } });
    setup();

    await waitFor(() => screen.getByRole('button', { name: /salvar/i }));
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
