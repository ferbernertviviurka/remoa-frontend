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
});
