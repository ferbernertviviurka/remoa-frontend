import { render, screen } from '@testing-library/react';
import { VerdictBox } from './verdict-box';
import { violations } from './test-utils';

const base = { matchedLabel: 'Acertou', missingLabel: 'Faltou', title: 'Quase lá', feedback: 'Faltou um ponto.' };

describe('VerdictBox', () => {
  it('sem violações axe e lista acertou/faltou', async () => {
    const { container } = render(<VerdictBox {...base} verdict="partial" matched={['A']} missing={['B']} />);
    expect(await violations(container)).toEqual([]);
    expect(screen.getByRole('status')).toHaveAttribute('data-verdict', 'partial');
    expect(screen.getByText('A')).toBeVisible();
    expect(screen.getByText('B')).toBeVisible();
    expect(screen.getByText('Faltou um ponto.')).toBeVisible();
  });
  it('omite lista vazia', () => {
    render(<VerdictBox {...base} verdict="correct" matched={['A']} missing={[]} />);
    expect(screen.queryByText('Faltou')).toBeNull();
  });
});
