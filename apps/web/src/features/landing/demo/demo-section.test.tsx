import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { strings } from '@remoa/strings';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
import { DemoSection } from './demo-section';

const d = strings.landing.demo;
afterEach(() => { cleanup(); track.mockClear(); });

describe('DemoSection', () => {
  it('hides step 5, answers right, reveals it, fires events in order and links to #cta in waitlist', () => {
    render(<DemoSection flags={{ launchPhase: 'waitlist' }} />);
    expect(screen.getByText(d.flow[4])).toBeTruthy();
    expect(screen.queryByRole('link', { name: d.cta })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(d.alternatives[d.correctIndex]) }));
    expect(screen.getByRole('status').textContent).toContain(d.verdicts.correct);
    expect(screen.getByRole('status').textContent).toContain(d.source);
    expect(screen.getByRole('status').textContent).toContain(d.demoLabel);
    expect(screen.queryByText(d.flow[4])).toBeNull();
    expect(screen.getByRole('link', { name: d.cta }).getAttribute('href')).toBe('#cta');
    expect(track.mock.calls.map((c) => c[0])).toEqual(['demo_started', 'demo_answered', 'demo_completed']);
    expect(track).toHaveBeenCalledWith('demo_answered', { correct: true });
  });

  it('wrong answer shows "Ainda não", retry resets, demo_started fires once, CTA is /cadastro when open', () => {
    render(<DemoSection flags={{ launchPhase: 'open' }} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(d.alternatives[1]) }));
    expect(screen.getByRole('status').textContent).toContain(d.verdicts.incorrect);
    expect(track).toHaveBeenCalledWith('demo_answered', { correct: false });
    expect(screen.getByRole('link', { name: d.cta }).getAttribute('href')).toBe('/cadastro');
    fireEvent.click(screen.getByRole('button', { name: d.retry }));
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(d.alternatives[0]) }));
    expect(track.mock.calls.filter((c) => c[0] === 'demo_started')).toHaveLength(1);
  });
});
