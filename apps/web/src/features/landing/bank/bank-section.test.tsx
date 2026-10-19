import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { strings } from '@remoa/strings/full';
import { BankSection } from './bank-section';

afterEach(cleanup);

describe('BankSection', () => {
  test('shows the verified public milestone, three real workflows and safe exam entry links', () => {
    render(<BankSection />);
    const b = strings.landing.bank;
    expect(screen.getByRole('heading', { name: 'Mais de 27 mil questões disponíveis.' })).toBeTruthy();
    for (const step of b.steps) expect(screen.getByText(step.text)).toBeTruthy();
    expect(screen.getByText(/Questões para 10 cursos da saúde/)).toBeTruthy();
    expect(screen.getByRole('link', { name: b.create })).toHaveAttribute('href', '/entrar?next=%2Fapp%2Fprova%2Fnova-prova');
    expect(screen.getByRole('link', { name: b.browse })).toHaveAttribute('href', '/entrar?next=%2Fapp%2Fprovas');
    expect(screen.getByText(b.coverageHelp)).toHaveTextContent('apenas parte da prova original');
    expect(screen.queryByRole('img')).toBeNull();
    expect(document.getElementById('banco')).toBeTruthy();
  });
});
