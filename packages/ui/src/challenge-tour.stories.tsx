import type { Meta, StoryObj } from '@storybook/react';
import { ChallengeTour } from './challenge-tour';

const steps = [
  { scene: 'format', title: 'Escolha o formato', body: 'Eu respondo ou IA responde; ordem aleatória ou pelas setas.' },
  { scene: 'answer', title: 'Responda um card', body: 'Escreva o que lembrar, sem olhar.' },
  { scene: 'reveal', title: 'Revele e marque', body: 'Acertei ou errei.' },
  { scene: 'glow', title: 'Veja o mapa acender', body: 'A lembrança estimada pinta o mapa.' },
] as const;

const meta = {
  title: 'ChallengeTour',
  component: ChallengeTour,
  args: {
    open: true,
    onOpenChange: () => undefined,
    onDone: () => undefined,
    title: 'Como funciona o desafio',
    closeLabel: 'Fechar',
    steps,
    stepLabels: steps.map((_, i) => `Passo ${i + 1} de 4`),
    labels: { next: 'Próximo', back: 'Voltar', done: 'Entendi' },
    demo: { card: 'Sepse', answer: 'Disfunção orgânica…', correct: 'Acertei', wrong: 'Errei', self: 'Eu respondo', ai: 'IA responde', soon: 'Em breve' },
  },
} satisfies Meta<typeof ChallengeTour>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
