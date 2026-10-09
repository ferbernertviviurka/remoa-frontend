import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { strings } from '@remoa/strings/full';
import { BankSection } from './bank-section';

afterEach(cleanup);

describe('BankSection', () => {
  test('shows the three steps and the animated preview', () => {
    render(<BankSection />);
    const b = strings.landing.bank;
    expect(screen.getByRole('heading', { name: b.title })).toBeTruthy();
    for (const step of b.steps) expect(screen.getByText(step.text)).toBeTruthy();
    expect(screen.getByRole('img', { name: b.playerLabel })).toBeTruthy();
    expect(document.getElementById('banco')).toBeTruthy();
  });
});
