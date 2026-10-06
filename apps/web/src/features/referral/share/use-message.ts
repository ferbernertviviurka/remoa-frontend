'use client';

import { useCallback, useRef, useState } from 'react';
import { REFERRAL_LIMITS } from '@remoa/contracts';
import { t } from '@remoa/strings/referral';
import { track } from '@/lib/analytics';

const KEY = 'remoa:referral-message';
const get = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const set = (v: string | null) => { try { if (v === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch { /* só não persiste */ } };

/** FR-5: mensagem editável (até 400 caracteres). A edição fica só neste navegador; "Restaurar texto" volta ao padrão. */
export function useMessage(link: string) {
  const fallback = t('referral.message.default', { link });
  const [message, setMessage] = useState(() => get() ?? fallback);
  const tracked = useRef(false);
  const edit = useCallback((v: string) => {
    const next = v.slice(0, REFERRAL_LIMITS.messageMaxChars);
    setMessage(next);
    set(next === fallback ? null : next);
    if (!tracked.current) { tracked.current = true; track('referral_message_edited', {}); }
  }, [fallback]);
  const restore = useCallback(() => { setMessage(fallback); set(null); }, [fallback]);
  return { message, edit, restore, edited: message !== fallback, max: REFERRAL_LIMITS.messageMaxChars };
}
