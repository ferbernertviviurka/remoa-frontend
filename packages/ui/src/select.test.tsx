import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './select';

describe('Select', () => {
  it('opens above the bottom sheets (z 55) and picks an option, so it works inside the mobile card panel', async () => {
    Element.prototype.scrollIntoView ??= () => undefined;
    const onValueChange = vi.fn();
    render(<Select label="Licença" value="own" onValueChange={onValueChange} options={[{ value: 'own', label: 'Própria' }, { value: 'cc', label: 'CC BY' }]} />);
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Licença' }), { key: 'Enter' });
    const option = await screen.findByRole('option', { name: 'CC BY' });
    const z = (el: Element | null) => Number(/\bz-\[(\d+)\]/.exec(el?.className ?? '')?.[1] ?? /\bz-(\d+)\b/.exec(el?.className ?? '')?.[1] ?? 0);
    expect(z(screen.getByRole('listbox'))).toBeGreaterThan(55);
    fireEvent.keyDown(option, { key: 'Enter' });
    expect(onValueChange).toHaveBeenCalledWith('cc');
  });
});
