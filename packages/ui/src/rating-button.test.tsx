import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RatingButton } from './rating-button';
import { violations } from './test-utils';

describe('RatingButton', () => {
  it('sem violações axe e mostra nota + intervalo', async () => {
    const { container } = render(<RatingButton label="Bom" hint="4 dias" shortcut="3" selected onClick={() => undefined} />);
    expect(await violations(container)).toEqual([]);
    const b = screen.getByRole('button', { name: 'Bom 4 dias' });
    expect(b).toHaveAttribute('aria-pressed', 'true');
    expect(b).toHaveAttribute('aria-keyshortcuts', '3');
  });
  it('clica; desabilitado não clica', async () => {
    const fn = vi.fn();
    const { rerender } = render(<RatingButton label="Bom" onClick={fn} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bom' }));
    expect(fn).toHaveBeenCalledTimes(1);
    rerender(<RatingButton label="Bom" disabled onClick={fn} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bom' }));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
