import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonBlock, SkeletonRegion } from './skeleton';
import { violations } from './test-utils';

describe('Skeleton', () => {
  it('região anuncia carregamento e os blocos são decorativos, sem violações axe', async () => {
    const { container } = render(
      <SkeletonRegion label="Carregando…">
        <SkeletonBlock width={200} height={40} radius={28} />
        <Skeleton lines={2} />
      </SkeletonRegion>,
    );
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveTextContent('Carregando…');
    expect(container.querySelector('.remoa-skeleton')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.remoa-skeleton')).toHaveStyle({ width: '200px', height: '40px', borderRadius: '28px' });
    expect(await violations(container)).toEqual([]);
  });
});
