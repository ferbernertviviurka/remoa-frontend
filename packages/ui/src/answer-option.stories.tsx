import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AnswerGroup, AnswerOption } from './answer-option';

function Demo() {
  const [value, setValue] = useState<string | null>('B');
  return (
    <AnswerGroup label="Alternativas">
      {['A', 'B', 'C'].map((k) => (
        <AnswerOption key={k} name="demo" value={k} letter={k} checked={value === k} onSelect={() => setValue(k)} eliminateLabel={`Eliminar ${k}`} onToggleEliminate={() => undefined}>
          {`Alternativa sintética ${k}`}
        </AnswerOption>
      ))}
    </AnswerGroup>
  );
}

const meta = { title: 'AnswerOption', component: Demo } satisfies Meta<typeof Demo>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
