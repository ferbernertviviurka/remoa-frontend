import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TextMorph } from 'torph/react';
import { Button } from './button';

const phrases = ['O que você aprende, fica.', 'Revise na hora certa.', 'Teste o que realmente lembra.'];

function Demo() {
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(12);
  return (
    <div className="flex max-w-lg flex-col items-start gap-8">
      <TextMorph as="p" locale="pt-BR" className="font-display text-3xl font-extrabold text-text">
        {phrases[index]}
      </TextMorph>
      <Button onClick={() => setIndex((value) => (value + 1) % phrases.length)}>Trocar frase</Button>
      <TextMorph locale="pt-BR" className="font-display text-5xl font-extrabold text-primary-deep">
        {total}
      </TextMorph>
      <Button variant="secondary" onClick={() => setTotal((value) => value + 7)}>Somar 7</Button>
    </div>
  );
}

const meta = { title: 'Torph/TextMorph' } satisfies Meta;
export default meta;

export const Playground: StoryObj = {
  render: () => <Demo />,
};
