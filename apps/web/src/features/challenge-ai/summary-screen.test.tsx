import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MapSummaryPublic } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { SummaryScreen } from './summary-screen';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiMock(...a) }));

const BOARD = '11111111-1111-4111-8111-111111111111';
const CARD = '22222222-2222-4222-8222-222222222222';

const summary = (over: Partial<MapSummaryPublic> = {}): MapSummaryPublic => ({
  id: '33333333-3333-4333-8333-333333333333',
  boardId: BOARD,
  boardVersion: 3,
  size: 'standard',
  focus: 'overview',
  sections: [
    { kind: 'overview', title: 'Panorama', items: [{ text: 'Insuficiência cardíaca em resumo <b>não é HTML</b>', cardIds: [CARD] }] },
    { kind: 'comparisons', title: 'Comparações', items: [], table: { header: ['A', 'B'], rows: [{ cells: ['x', 'y'], cardIds: [CARD] }] } },
  ],
  stale: false,
  createdAt: new Date('2026-10-07T12:00:00.000Z'),
  ...over,
});

beforeEach(() => {
  apiMock.mockReset();
  push.mockReset();
});
afterEach(cleanup);

const mount = (props: Partial<Parameters<typeof SummaryScreen>[0]> = {}) => render(<SummaryScreen boardId={BOARD} cardTitles={{ [CARD]: 'Insuficiência cardíaca' }} {...props} />);

describe('SummaryScreen', () => {
  it('shows the disclaimer before anything is generated', () => {
    mount();
    expect(screen.getByText(t('challengeAi.summaryDisclaimer'))).toBeTruthy();
  });

  it('posts boardId, size and focus and renders the sections as text', async () => {
    apiMock.mockResolvedValue({ ok: true, data: summary({ size: 'full', focus: 'high_yield' }) });
    mount();
    fireEvent.click(screen.getByRole('button', { name: t('challengeAi.summarySize.full') }));
    fireEvent.click(screen.getByRole('button', { name: t('challengeAi.summaryFocus.high_yield') }));
    fireEvent.click(screen.getByRole('button', { name: t('challengeAi.summaryButton') }));

    await screen.findByRole('heading', { name: 'Panorama' });
    expect(apiMock).toHaveBeenCalledTimes(1);
    const [path, init] = apiMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/v1/challenge-ai/summaries');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ boardId: BOARD, size: 'full', focus: 'high_yield' });
    // model text is text, never markup
    expect(screen.getByText(/não é HTML/).querySelector('b')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Comparações' })).toBeTruthy();
    expect(screen.queryByText(t('challengeAi.summaryStale'))).toBeNull();
    expect(screen.getByText(t('challengeAi.summaryDisclaimer'))).toBeTruthy();
  });

  it('card ids are buttons that open the card in the map', async () => {
    apiMock.mockResolvedValue({ ok: true, data: summary() });
    mount();
    fireEvent.click(screen.getByRole('button', { name: t('challengeAi.summaryButton') }));
    await screen.findByRole('heading', { name: 'Panorama' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Insuficiência cardíaca' })[0]!);
    expect(push).toHaveBeenCalledWith(`/app/mapas/${BOARD}?card=${CARD}`);
  });

  it('shows the stale banner and lets the student generate again', async () => {
    apiMock.mockResolvedValue({ ok: true, data: summary() });
    mount({ initial: summary({ stale: true }) });
    expect(screen.getByText(t('challengeAi.summaryStale'))).toBeTruthy();
    expect(screen.getByText(t('challengeAi.summaryDisclaimer'))).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: t('challengeAi.summaryButton') }));
    await waitFor(() => expect(screen.queryByText(t('challengeAi.summaryStale'))).toBeNull());
    expect(apiMock).toHaveBeenCalledTimes(1);
  });

  it('copies plain text and prints', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    mount({ initial: summary() });

    fireEvent.click(screen.getByRole('button', { name: t('challengeAi.copy') }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(String(writeText.mock.calls[0]?.[0])).toContain('Panorama');
    fireEvent.click(screen.getByRole('button', { name: t('challengeAi.print') }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('Reportar erro sends the summary id and then hides the button', async () => {
    const id = summary().id;
    apiMock.mockResolvedValue({ ok: true, data: { reported: true } });
    mount({ initial: summary() });
    fireEvent.click(screen.getByRole('button', { name: t('challengeAi.report') }));
    await screen.findByRole('status');
    expect(apiMock).toHaveBeenCalledWith(`/v1/challenge-ai/summaries/${id}/report`, { method: 'POST', body: '{}' });
    expect(screen.queryByRole('button', { name: t('challengeAi.report') })).toBeNull();
    expect(screen.getByText(t('challengeAi.reportSent'))).toBeTruthy();
  });

  it('shows an error alert when the API fails or answers outside the schema', async () => {
    apiMock.mockResolvedValueOnce({ ok: false, error: { code: 'quota_exceeded', message: 'q' } });
    mount();
    fireEvent.click(screen.getByRole('button', { name: t('challengeAi.summaryButton') }));
    expect((await screen.findByRole('alert')).textContent).toContain(t('errors.quota_exceeded'));

    apiMock.mockResolvedValueOnce({ ok: true, data: { ...summary(), correctKey: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: t('challengeAi.summaryButton') }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(t('errors.internal')));
  });
});
