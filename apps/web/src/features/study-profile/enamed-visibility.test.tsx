import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { profileCapabilities, type StudyProfile } from '@remoa/contracts';
import { Rail } from '@/features/shell/rail';
import { MobileMenu } from '@/features/shell/mobile-menu';
import { CoverageSlot } from '@/features/home/coverage-slot';
import { CoverageGate } from '@/features/coverage/coverage-gate';
import { ConfirmBanner } from './confirm-banner';
import { publishStudyProfile, resetStudyProfileCache } from './use-study-profile';

const api = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/features/questions/flags', () => ({ useQuestionFeatureFlags: () => ({}), questionDestinationEnabled: () => true }));
vi.mock('next/navigation', () => ({ usePathname: () => '/app/hoje', useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/features/auth/sign-out', () => ({ signOutToLogin: vi.fn() }));
vi.mock('@/features/support/open', () => ({ openSupport: vi.fn() }));

const profile = (course: StudyProfile['course'], situation: StudyProfile['situation'], source: StudyProfile['source'] = 'profile'): StudyProfile => ({ course, situation, source } as unknown as StudyProfile);
const state = (p: StudyProfile | null) => ({ ok: true, data: { profile: p, capabilities: profileCapabilities(p) } });
// [name, profile, Enamed in the menu, Enamed coverage on Hoje] — both follow showEnamed (G28: no Enamed on desktop, mobile or Hoje for other profiles)
const profiles: [string, StudyProfile | null, boolean, boolean][] = [
  ['no row', null, true, true],
  ['migration', profile('medicine', 'graduacao', 'migration'), true, true],
  ['medicine + graduacao', profile('medicine', 'graduacao'), true, true],
  ['medicine + residente', profile('medicine', 'residente'), false, false],
  ['nursing + graduacao', profile('nursing', 'graduacao'), false, false],
  ['other_health', profile('other_health', 'graduacao'), false, false],
  ['not_health', profile('not_health', 'graduacao'), false, false],
];

beforeEach(() => resetStudyProfileCache());
afterEach(() => { cleanup(); vi.clearAllMocks(); sessionStorage.clear(); });

describe.each(profiles)('%s', (_n, p, enamed, hojeEnamed) => {
  it('Rail, mobile menu and Hoje follow showEnamed', async () => {
    api.mockResolvedValue(state(p));
    render(<><Rail /><MobileMenu /><CoverageSlot><span>cobertura enamed</span></CoverageSlot></>);
    await waitFor(() => expect(screen.queryByText('cobertura enamed') !== null).toBe(hojeEnamed));
    await waitFor(() => expect(screen.queryAllByRole('link', { name: 'Enamed' }).length > 0).toBe(enamed));
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    const menu = within(await screen.findByRole('dialog'));
    expect(menu.queryAllByRole('link', { name: 'Enamed' }).length).toBe(enamed ? 1 : 0);
    if (!hojeEnamed) expect(screen.getByRole('link', { name: 'Definir o meu foco', hidden: true })).toHaveAttribute('href', '/app/conta/perfil?campo=estudo');
  });
});

describe('gate notice', () => {
  it('is a friendly notice with the link to change the study', () => {
    render(<CoverageGate />);
    expect(screen.getByRole('heading', { name: 'Disponível para estudantes de Medicina' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Alterar o meu estudo' })).toHaveAttribute('href', '/app/conta/perfil?campo=estudo');
  });
});

describe('ConfirmBanner', () => {
  it('shows only when confirmation is needed, hides on dismiss for the session and goes away after confirming', async () => {
    api.mockResolvedValue(state(profile('medicine', 'graduacao', 'migration')));
    const { unmount } = render(<ConfirmBanner />);
    expect(await screen.findByText('Confirme o seu estudo')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Confirmar' })).toHaveAttribute('href', '/app/conta/perfil?campo=estudo');
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(screen.queryByText('Confirme o seu estudo')).toBeNull();
    unmount();
    render(<ConfirmBanner />); // same session: stays dismissed
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(screen.queryByText('Confirme o seu estudo')).toBeNull();
    sessionStorage.clear(); // next access
    cleanup();
    render(<ConfirmBanner />);
    expect(await screen.findByText('Confirme o seu estudo')).toBeTruthy();
    act(() => publishStudyProfile(state(profile('medicine', 'graduacao')).data as never));
    expect(screen.queryByText('Confirme o seu estudo')).toBeNull();
  });

  it('is absent for a confirmed profile', async () => {
    api.mockResolvedValue(state(profile('nursing', 'graduacao')));
    render(<ConfirmBanner />);
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(screen.queryByText('Confirme o seu estudo')).toBeNull();
  });
});

describe('FR-25 live update', () => {
  it('the rail drops Enamed right after publishStudyProfile, without reload', async () => {
    api.mockResolvedValue(state(profile('medicine', 'graduacao')));
    render(<Rail />);
    expect(await screen.findByRole('link', { name: 'Enamed' })).toBeTruthy();
    act(() => publishStudyProfile(state(profile('nursing', 'graduacao')).data as never));
    expect(screen.queryByRole('link', { name: 'Enamed' })).toBeNull();
  });
});
