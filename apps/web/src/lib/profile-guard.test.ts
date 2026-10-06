import { beforeEach, describe, expect, it, vi } from 'vitest';

const serverApi = vi.fn();
const redirect = vi.fn((to: string) => { throw new Error(`redirect:${to}`); });
let path: string | null = '/app/mapas?x=1';
vi.mock('@/lib/api/server', () => ({ serverApi: (...a: unknown[]) => serverApi(...a) }));
vi.mock('next/navigation', () => ({ redirect: (to: string) => redirect(to) }));
vi.mock('next/headers', () => ({ headers: async () => ({ get: () => path }) }));

const me = (profile: object) => ({ ok: true, data: { profile } });
const full = { name: 'Ana Souza', phone: '+5511912345678', userType: 'aluno' };

describe('requireCompleteProfile (G20)', () => {
  beforeEach(() => { vi.clearAllMocks(); path = '/app/mapas?x=1'; });

  it('perfil completo: não redireciona', async () => {
    serverApi.mockResolvedValue(me(full));
    const { requireCompleteProfile } = await import('./profile-guard');
    await expect(requireCompleteProfile()).resolves.toBeUndefined();
  });

  it('falta telefone: vai ao onboarding com o destino atual em next', async () => {
    serverApi.mockResolvedValue(me({ ...full, phone: null }));
    const { requireCompleteProfile } = await import('./profile-guard');
    await expect(requireCompleteProfile()).rejects.toThrow('redirect:/app/onboarding?next=%2Fapp%2Fmapas%3Fx%3D1');
  });

  it('destino ausente ou externo cai em /app/hoje; falha da API não prende o usuário', async () => {
    serverApi.mockResolvedValue(me({ ...full, name: null }));
    path = '//evil.com';
    const { requireCompleteProfile } = await import('./profile-guard');
    await expect(requireCompleteProfile()).rejects.toThrow('next=%2Fapp%2Fhoje');
    serverApi.mockResolvedValue({ ok: false, error: { code: 'internal', message: 'x' } });
    await expect(requireCompleteProfile()).resolves.toBeUndefined();
  });
});
