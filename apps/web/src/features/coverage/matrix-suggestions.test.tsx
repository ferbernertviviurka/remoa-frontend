import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MatrixItem } from '@remoa/contracts';
import { MatrixLinkButton } from './matrix-suggestions';

const api = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const sepse: MatrixItem = { id: 'i1', area: 'CM', code: '1', title: 'Sepse e choque séptico', parentId: null, targetCards: 40 };

describe('MatrixLinkButton', () => {
  it('asks for the board title and a single click picks the item', async () => {
    api.mockResolvedValue({ ok: true, data: [sepse] });
    const onPick = vi.fn();
    render(<MatrixLinkButton title="Sepse grave" onPick={onPick} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ligar a Sepse e choque séptico' }));
    expect(api).toHaveBeenCalledWith('/v1/matrix/suggest?title=Sepse%20grave');
    expect(onPick).toHaveBeenCalledWith(sepse);
  });

  it('renders nothing when the API has no suggestion or fails', async () => {
    api.mockResolvedValue({ ok: false, error: { code: 'internal', message: 'x' } });
    const { container } = render(<MatrixLinkButton title="Xyz" onPick={vi.fn()} />);
    await vi.waitFor(() => expect(api).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
