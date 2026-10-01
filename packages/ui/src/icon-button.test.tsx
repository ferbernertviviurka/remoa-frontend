import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton } from './icon-button';
import { violations } from './test-utils';

describe('IconButton', () => {
  it('sem violações axe', async () => {
    const { container } = render(<IconButton aria-label="Fechar"><svg /></IconButton>);
    expect(await violations(container)).toEqual([]);
  });
  it('click dispara', async () => {
    const fn = vi.fn();
    render(<IconButton aria-label="Fechar" onClick={fn}><svg /></IconButton>);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(fn).toHaveBeenCalledOnce();
  });
  it('aria-label ausente é erro de tipo', () => {
    // @ts-expect-error aria-label é obrigatório no tipo
    const el = <IconButton><svg /></IconButton>;
    expect(el).toBeTruthy();
  });
});
