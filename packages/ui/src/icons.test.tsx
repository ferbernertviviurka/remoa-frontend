import { render } from '@testing-library/react';
import { Icon, iconNames } from './icons';

describe('Icon', () => {
  it('star e filter existem, decorativos, e aceitam preenchimento', () => {
    expect(iconNames).toEqual(expect.arrayContaining(['star', 'filter']));
    const { container } = render(<Icon name="star" fill="currentColor" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('fill')).toBe('currentColor');
    expect(svg.querySelector('path')).not.toBeNull();
  });
});
