import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Next's router.push dispatches a transition action that stays pending until the route renders; a pending promise models that.
const push = vi.fn<(href: string) => Promise<void>>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }) }));

import { useNavigate } from './use-navigate';

function Probe() {
  const [navigating, nav] = useNavigate();
  return <button onClick={() => nav.push('/x')}>{navigating ? 'pending' : 'idle'}</button>;
}

describe('useNavigate', () => {
  it('stays pending until the navigation resolves', async () => {
    let done!: () => void;
    push.mockReturnValue(new Promise<void>((r) => (done = r)));
    render(<Probe />);
    expect(screen.getByRole('button').textContent).toBe('idle');
    await act(async () => { screen.getByRole('button').click(); });
    expect(push).toHaveBeenCalledWith('/x');
    expect(screen.getByRole('button').textContent).toBe('pending');
    await act(async () => { done(); });
    expect(screen.getByRole('button').textContent).toBe('idle');
  });
});
