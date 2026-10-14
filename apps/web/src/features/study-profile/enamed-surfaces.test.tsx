import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { profileCapabilities, type Board, type StudyProfile } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { CanvasHeader } from '@/features/map/canvas/canvas-header';
import { AboutMapForm, emptyAboutMap, type AboutMap } from '@/features/map/create/about-map-form';
import { resetStudyProfileCache } from './use-study-profile';

const api = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const asProfile = (course: StudyProfile['course']) => { const p = { course, situation: 'graduacao', source: 'profile' } as unknown as StudyProfile; return { ok: true, data: { profile: p, capabilities: profileCapabilities(p) } }; };
const board = { id: 'b', title: 'Mapa', area: 'CM', status: 'seed', archivedAt: null, updatedAt: new Date().toISOString() } as unknown as Board;
const header = () => render(<ToastProvider closeLabel="Fechar" viewportLabel="Avisos"><CanvasHeader board={board} status={{ state: 'idle', savedAt: null } as never} onRetry={vi.fn()} mode="explore" onMode={vi.fn()} missing={0} coverage={{ pct: 42, item: 'ENARE' }} due={0} /></ToastProvider>);
beforeEach(() => resetStudyProfileCache());
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('map header coverage link (FR-26)', () => {
  it('stays for medicine and disappears for nursing', async () => {
    api.mockResolvedValue(asProfile('medicine'));
    header();
    expect((await screen.findAllByRole('link', { name: /cobre 42%/ })).length).toBeGreaterThan(0);
    cleanup(); resetStudyProfileCache();
    api.mockResolvedValue(asProfile('nursing'));
    header();
    await waitFor(() => expect(screen.queryAllByRole('link', { name: /cobre 42%/ })).toHaveLength(0));
  });
});

function Form() {
  const [v, setV] = useState<AboutMap>(emptyAboutMap());
  return <><AboutMapForm value={v} onChange={setV} items={[]} suggestions={[]} showErrors={false} /><output>{v.area}</output></>;
}
describe('Novo mapa area (FR-29)', () => {
  it('keeps CM preselected for enamed profiles', async () => {
    api.mockResolvedValue(asProfile('medicine'));
    render(<Form />);
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(screen.getByRole('status').textContent).toBe('CM');
  });
  it('does not preselect CM for other profiles and explains the free-form area', async () => {
    api.mockResolvedValue(asProfile('nursing'));
    render(<Form />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('OUTRO'));
    expect(screen.getByText(/aparece só para quem estuda Medicina/)).toBeTruthy();
  });
});
