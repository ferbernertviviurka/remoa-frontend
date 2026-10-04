import { render, screen } from '@testing-library/react';
import { BarChart } from './chart';

describe('BarChart', () => {
  it('names every bar, including a day with no reviews', () => {
    render(
      <BarChart
        label="Revisões por dia"
        items={[{ id: '2026-10-01', value: 0 }, { id: '2026-10-02', value: 4 }]}
        barLabel={(item) => `${item.id}: ${item.value}`}
      />,
    );
    expect(screen.getByRole('list', { name: 'Revisões por dia' })).toBeTruthy();
    expect(screen.getByText('2026-10-01: 0')).toBeTruthy();
    expect(screen.getByText('2026-10-02: 4')).toBeTruthy();
  });
});
