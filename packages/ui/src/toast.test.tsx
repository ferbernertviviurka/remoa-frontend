import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './toast';
import { violations } from './test-utils';

function Fire() {
  const { toast } = useToast();
  return <button onClick={() => toast({ title: 'Salvo', description: 'ok' })}>Disparar</button>;
}
const ui = <ToastProvider closeLabel="Fechar" viewportLabel="Avisos"><Fire /></ToastProvider>;

describe('Toast', () => {
  it('aparece ao disparar e fecha', async () => {
    render(ui);
    await userEvent.click(screen.getByText('Disparar'));
    expect(await screen.findByText('Salvo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByText('Salvo')).not.toBeInTheDocument();
  });
  it('sem violações axe', async () => {
    const { container } = render(ui);
    await userEvent.click(screen.getByText('Disparar'));
    await screen.findByText('Salvo');
    expect(await violations(container)).toEqual([]);
  });
});
