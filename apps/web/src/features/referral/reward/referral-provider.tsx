'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ReferralSummary } from '@remoa/contracts';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { friendName } from '../format';
import { newlyQualified, qualifiedIds, readHint, readSeen, writeHint, writeSeen } from './new-rewards';
import { RewardNotice } from './reward-notice';

export const POLL_MS = 30_000;
const PULSE_MS = 3_400;

type Status = 'idle' | 'loading' | 'ready' | 'error';
type Ctx = {
  summary: ReferralSummary | null;
  status: Status;
  /** Consulta de novo, mostrando o erro se falhar (botão "Tentar de novo"). */
  reload: () => Promise<void>;
  /** A página de indicação chama no efeito: enquanto montada, o summary é consultado a cada 30 s. Devolve a limpeza. */
  watch: () => () => void;
  /** Recompensa nova há instantes: o cartão pulsa duas vezes. */
  pulse: boolean;
  /** Nome de quem acabou de criar o primeiro mapa (aviso aberto) e como fechar. */
  notice: string | null;
  dismissNotice: () => void;
  /** O usuário compartilhou o link: vale consultar o summary também fora da página (D-413). */
  markShared: () => void;
};

const noop = async () => {};
const ReferralContext = createContext<Ctx>({ summary: null, status: 'idle', reload: noop, watch: () => () => {}, pulse: false, notice: null, dismissNotice: () => {}, markShared: () => {} });
export const useReferral = () => useContext(ReferralContext);

/**
 * F18 FR-12. Um só dono do summary para o app inteiro (fica no shell): consulta a cada 30 s enquanto a aba está visível, mas só quando a
 * página /app/indicar está aberta ou o navegador tem indicação pendente (D-413), e avisa (`role="status"`) quando uma indicação vira
 * "primeiro mapa criado", em qualquer tela.
 */
export function ReferralProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [watchers, setWatchers] = useState(0);
  const [hint, setHint] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const have = useRef(false);
  const pulseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => setHint(readHint()), []);
  useEffect(() => () => clearTimeout(pulseTimer.current), []);

  const apply = useCallback((next: ReferralSummary) => {
    const fresh = newlyQualified(readSeen(), next);
    writeSeen(qualifiedIds(next));
    // D-413: pendente = alguém ainda não criou o primeiro mapa. Sem amigos não mexe (o hint de "compartilhou" vale).
    if (next.friends.length > 0) writeHint(next.friends.some((f) => f.status !== 'qualified'));
    if (fresh.length > 0) {
      setNotice(friendName(fresh[0]!));
      setPulse(true);
      clearTimeout(pulseTimer.current);
      pulseTimer.current = setTimeout(() => setPulse(false), PULSE_MS);
      track('referral_reward_seen', {});
    }
    have.current = true;
    setSummary(next);
    setStatus('ready');
  }, []);

  const load = useCallback(
    async (quiet: boolean) => {
      if (!have.current) setStatus('loading');
      try {
        const r = await api<ReferralSummary>('/v1/referral/summary');
        if (r.ok) apply(r.data);
        else if (!quiet || !have.current) setStatus('error');
      } catch {
        if (!quiet || !have.current) setStatus('error');
      }
    },
    [apply],
  );

  const enabled = watchers > 0 || hint;
  useEffect(() => {
    if (!enabled) return;
    void load(watchers === 0);
    const tick = () => { if (document.visibilityState === 'visible') void load(true); };
    const id = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [enabled, watchers === 0, load]); // eslint-disable-line react-hooks/exhaustive-deps -- reinicia só ao ligar/desligar ou ao entrar/sair da página

  const watch = useCallback(() => {
    setWatchers((n) => n + 1);
    return () => setWatchers((n) => n - 1);
  }, []);
  const markShared = useCallback(() => { writeHint(true); setHint(true); }, []);
  const reload = useCallback(() => load(false), [load]);

  const dismissNotice = useCallback(() => setNotice(null), []);
  const value = useMemo(() => ({ summary, status, reload, watch, pulse, notice, dismissNotice, markShared }), [summary, status, reload, watch, pulse, notice, dismissNotice, markShared]);
  return (
    <ReferralContext.Provider value={value}>
      {children}
      {/* Em /app/indicar o aviso é a faixa da própria página */}
      <RewardNotice variant="toast" name={watchers === 0 ? notice : null} onClose={dismissNotice} />
    </ReferralContext.Provider>
  );
}
