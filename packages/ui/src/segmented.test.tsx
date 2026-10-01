import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Segmented } from './segmented';
import { violations } from './test-utils';

const options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];

describe('Segmented', () => {
  it('sem violações axe', async () => {
    const { container } = render(<Segmented aria-label="Modo" options={options} defaultValue="a" />);
    expect(await violations(container)).toEqual([]);
  });
  it('muda valor e não permite desmarcar', async () => {
    const fn = vi.fn();
    render(<Segmented aria-label="Modo" options={options} defaultValue="a" onValueChange={fn} />);
    await userEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(fn).toHaveBeenCalledWith('b');
    await userEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
