import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnswerGroup, AnswerOption } from './answer-option';
import { IconButton } from './icon-button';
import { Pill } from './pill';
import { Icon, iconNames } from './icons';
import { violations } from './test-utils';

function Demo() {
  const [value, setValue] = useState<string | null>(null);
  const [out, setOut] = useState(false);
  return (
    <AnswerGroup label="Alternativas">
      {['A', 'B'].map((k) => (
        <AnswerOption key={k} name="q" value={k} letter={k} checked={value === k} onSelect={() => setValue(k)}
          eliminated={k === 'B' && out} eliminateLabel={`Eliminar ${k}`} onToggleEliminate={k === 'B' ? () => setOut((v) => !v) : undefined}>
          {`Texto ${k}`}
        </AnswerOption>
      ))}
    </AnswerGroup>
  );
}

describe('AnswerOption', () => {
  it('radiogroup acessível, sem violações axe', async () => {
    const { container } = render(<Demo />);
    expect(screen.getByRole('radiogroup', { name: 'Alternativas' })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('clicar na linha marca uma só alternativa; setas trocam', async () => {
    render(<Demo />);
    await userEvent.click(screen.getByText('Texto A'));
    expect(screen.getByRole('radio', { name: /Texto A/ })).toBeChecked();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: /Texto B/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Texto A/ })).not.toBeChecked();
  });
  it('eliminar alterna aria-pressed sem marcar', async () => {
    render(<Demo />);
    const b = screen.getByRole('button', { name: 'Eliminar B' });
    await userEvent.click(b);
    expect(b).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('radio', { name: /Texto B/ })).not.toBeChecked();
  });
});

describe('tons ai/danger, coração e favorito', () => {
  it('Pill ai e IconButton danger pressionado', () => {
    render(<><Pill tone="ai">IA</Pill><IconButton aria-label="Favoritar" aria-pressed pressedTone="danger"><Icon name="heart" fill="currentColor" /></IconButton></>);
    expect(screen.getByText('IA').className).toContain('bg-ai-bg');
    expect(screen.getByRole('button', { name: 'Favoritar', pressed: true }).className).toContain('aria-pressed:text-danger');
    expect(iconNames).toContain('heart');
  });
});
