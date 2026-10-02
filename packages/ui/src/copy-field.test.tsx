import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyField } from './copy-field';
import { violations } from './test-utils';

const url = 'https://remoa.app/m/AbCdEf123';

function setup(onCopied?: () => void) {
  return render(
    <CopyField
      label="Link de compartilhamento"
      value={url}
      copyLabel="Copiar"
      copiedLabel="Copiado"
      onCopied={onCopied}
    />,
  );
}

describe('CopyField', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  it('sem violações axe', async () => {
    const { container } = setup();
    expect(await violations(container)).toEqual([]);
  });

  it('campo é somente leitura e exibe o valor', () => {
    setup();
    const input = screen.getByRole('textbox', { name: 'Link de compartilhamento' });
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveValue(url);
  });

  it('botão Copiar chama clipboard e onCopied', async () => {
    const onCopied = vi.fn();
    setup(onCopied);
    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
    expect(onCopied).toHaveBeenCalledOnce();
  });

  it('botão muda para "Copiado" após copiar', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    // State should flip to "Copiado" immediately after the clipboard write resolves
    expect(screen.getByRole('button', { name: 'Copiado' })).toBeInTheDocument();
  });

  it('exibe "Copiar" inicialmente (antes de interação)', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copiado' })).not.toBeInTheDocument();
  });
});
