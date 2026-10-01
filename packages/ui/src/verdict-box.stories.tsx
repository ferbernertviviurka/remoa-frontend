import type { Meta, StoryObj } from '@storybook/react';
import { VerdictBox } from './verdict-box';

const meta = {
  title: 'VerdictBox',
  component: VerdictBox,
  args: { matchedLabel: 'Acertou', missingLabel: 'Faltou', matched: ['Disfunção orgânica'], missing: [], feedback: 'Boa resposta.' },
} satisfies Meta<typeof VerdictBox>;
export default meta;
type S = StoryObj<typeof meta>;
export const Correct: S = { args: { verdict: 'correct', title: 'Acertou' } };
export const Partial: S = { args: { verdict: 'partial', title: 'Quase lá', missing: ['Resposta desregulada à infecção'] } };
export const Incorrect: S = { args: { verdict: 'incorrect', title: 'Não foi dessa vez', matched: [], missing: ['Disfunção orgânica'] } };
