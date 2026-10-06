'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const TourDialog = dynamic(() => import('./tour-dialog').then((m) => m.TourDialog), { ssr: false });

const EVENT = 'remoa:challenge-tour';
/**
 * D-606: "já viu o tutorial do desafio" fica no navegador. Não há campo por usuário no perfil/onboarding (CCR se o
 * Fernando quiser entre aparelhos, P-249). try/catch: storage bloqueado = mostra de novo, nunca quebra o mapa.
 */
export const TOUR_KEY = 'remoa-challenge-tour';

export const openChallengeTour = () => window.dispatchEvent(new Event(EVENT));

/** First own map opened in this browser: shows the tour once. */
export function maybeShowChallengeTour() {
  try {
    if (localStorage.getItem(TOUR_KEY)) return;
  } catch {
    /* storage blocked: show it */
  }
  openChallengeTour();
}

const markSeen = () => {
  try {
    localStorage.setItem(TOUR_KEY, '1');
  } catch {
    /* storage blocked */
  }
};

/** Mounted once in the shell: opens on `openChallengeTour()` (first map, palette, map help). Closing in any way marks it seen. */
export function ChallengeTourHost() {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  useEffect(() => {
    const show = () => {
      setUsed(true);
      setOpen(true);
    };
    window.addEventListener(EVENT, show);
    return () => window.removeEventListener(EVENT, show);
  }, []);
  return used ? (
    <TourDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) markSeen();
        setOpen(o);
      }}
      onDone={markSeen}
    />
  ) : null;
}
