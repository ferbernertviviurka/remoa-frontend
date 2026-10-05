import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChallengeTour } from './challenge-tour';
import { violations } from './test-utils';

const steps = (['format', 'answer', 'reveal', 'glow'] as const).map((scene, i) => ({ scene, title: `Título ${i + 1}`, body: `Texto ${i + 1}` }));
const props = {
  title: 'Como funciona',
  closeLabel: 'Fechar',
  steps,
  stepLabels: steps.map((_, i) => `Passo ${i + 1} de 4`),
  labels: { next: 'Próximo', back: 'Voltar', done: 'Entendi' },
  demo: { card: 'Sepse', answer: 'Resposta', correct: 'Acertei', wrong: 'Errei', self: 'Eu respondo', ai: 'IA responde', soon: 'Em breve' },
};

describe('ChallengeTour', () => {
  it('avança, volta e termina com Entendi (onDone + fecha); sem violações axe', async () => {
    const onDone = vi.fn();
    const onOpenChange = vi.fn();
    render(<ChallengeTour {...props} open onOpenChange={onOpenChange} onDone={onDone} />);
    expect(screen.getByRole('dialog', { name: 'Como funciona' })).toBeInTheDocument();
    expect(await violations(document.body)).toEqual([]);
    expect(screen.getByRole('heading', { name: 'Título 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument();
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByText('Passo 4 de 4')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Título 3' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(onDone).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
