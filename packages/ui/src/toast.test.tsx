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
  it('o 1º toast é anunciado pela região viva sempre montada', async () => {
    const { container } = render(ui);
    const live = container.querySelector('[aria-live="polite"]')!;
    expect(live).toBeEmptyDOMElement();
    await userEvent.click(screen.getByText('Disparar'));
    expect(live).toHaveTextContent('Salvo. ok.'); // síncrono, antes do host lazy
    await screen.findByText('Salvo');
  });
  it('sem violações axe', async () => {
    const { container } = render(ui);
    await userEvent.click(screen.getByText('Disparar'));
    await screen.findByText('Salvo');
    expect(await violations(container)).toEqual([]);
  });
});
