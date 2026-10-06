'use client';

// D-954 (P-401): Google sign-ups skip the sign-up form, so no version was recorded. On the first onboarding render we ask the API what is pending
// and, if so, accept the current versions it reports (GET /v1/account/legal, POST /v1/account/legal/accept). Failures are silent: retried next visit.
import { useEffect } from 'react';
import type { LegalStatus } from '@remoa/contracts';
import { api } from '@/lib/api';

export function useAcceptLegal(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    void (async () => {
      const s = await api<LegalStatus>('/v1/account/legal').catch(() => null);
      if (s?.ok && s.data.needsAcceptance) {
        await api('/v1/account/legal/accept', { method: 'POST', body: JSON.stringify({ termsVersion: s.data.termsVersion, privacyVersion: s.data.privacyVersion }) }).catch(() => null);
      }
    })();
  }, [enabled]);
}
