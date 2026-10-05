import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './checkbox';
import { Switch } from './switch';
import { violations } from './test-utils';

describe('Checkbox / Switch', () => {
  it('sem violações axe', async () => {
    const { container } = render(<><Checkbox label="Aceito" /><Switch label="Ligado" /></>);
    expect(await violations(container)).toEqual([]);
  });
  it('checkbox alterna', async () => {
    render(<Checkbox label="Aceito" />);
    const c = screen.getByRole('checkbox', { name: 'Aceito' });
    await userEvent.click(c);
    expect(c).toBeChecked();
    await userEvent.click(c);
    expect(c).not.toBeChecked();
  });
  it('switch alterna', async () => {
    render(<Switch label="Ligado" />);
    const s = screen.getByRole('switch', { name: 'Ligado' });
    await userEvent.click(s);
    expect(s).toBeChecked();
  });
  it('aceita ReactNode no rótulo: link no rótulo não alterna e o nome acessível inclui o texto', async () => {
    const { container } = render(<Checkbox label={<>Aceito os <a href="/termos" onClick={(e) => e.preventDefault()}>Termos</a></>} />);
    const c = screen.getByRole('checkbox', { name: 'Aceito os Termos' });
    await userEvent.click(screen.getByRole('link', { name: 'Termos' }));
    expect(c).not.toBeChecked();
    expect(await violations(container)).toEqual([]);
  });
  it('invalid marca aria-invalid; rótulo longo mantém linha de 44 px e é clicável', async () => {
    const { container } = render(<Checkbox invalid label="Concordo com os termos e com a política de privacidade, conforme a LGPD, e quero criar a minha conta agora." />);
    const c = screen.getByRole('checkbox');
    expect(c).toHaveAttribute('aria-invalid', 'true');
    await userEvent.click(screen.getByText(/Concordo com os termos/));
    expect(c).toBeChecked();
    expect(await violations(container)).toEqual([]);
  });
});
