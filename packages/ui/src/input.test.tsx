import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input';
import { Textarea } from './textarea';
import { violations } from './test-utils';

describe('Input / Textarea', () => {
  it('sem violações axe', async () => {
    const { container } = render(<><Input label="Nome" /><Textarea label="Notas" /></>);
    expect(await violations(container)).toEqual([]);
  });
  it('label ligado ao campo', async () => {
    render(<><Input label="Nome" /><Textarea label="Notas" /></>);
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana');
    await userEvent.type(screen.getByLabelText('Notas'), 'oi');
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana');
    expect(screen.getByLabelText('Notas')).toHaveValue('oi');
  });
});
