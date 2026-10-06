'use client';

import { createElement, useEffect, useState } from 'react';

type TextMorphComponent = typeof import('torph/react').TextMorph;
let loaded: TextMorphComponent | undefined;
let loading: Promise<TextMorphComponent> | undefined;
const appReduced = () => document.documentElement.dataset.motion === 'reduced';
const reducedMotion = () => appReduced() || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/**
 * O `TextMorph` do Torph (~10,5 KB) depois da primeira pintura (P-512): null no 1º render (bate com o HTML do servidor) e até o chunk
 * chegar; com movimento reduzido (sistema ou `<html data-motion="reduced">`) continua null e o Torph nem baixa. Usado pelo Button e pelo Morph.
 */
export function useTextMorph(): TextMorphComponent | null {
  const [M, setM] = useState<TextMorphComponent | null>(null);
  useEffect(() => {
    if (reducedMotion()) return;
    const ready = loaded;
    if (ready) return setM(() => ready);
    let live = true;
    (loading ??= import('torph/react').then((m) => (loaded = m.TextMorph))).then(
      (C) => live && setM(() => C),
      () => undefined, // sem o chunk (offline): fica o texto simples
    );
    return () => {
      live = false;
    };
  }, []);
  return M;
}

/** Preferência do app (`<html data-motion="reduced">`, F13) além do `prefers-reduced-motion` do sistema, que o Torph já lê. */
function useAppReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setReduced(el.dataset.motion === 'reduced');
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ['data-motion'] });
    return () => mo.disconnect();
  }, []);
  return reduced;
}

/**
 * Morph: `TextMorph` (Torph) com a configuração do produto, para texto que muda com o estado (preço, período, nota).
 * Movimento reduzido (sistema ou preferência do app): troca direta. O texto real fica acessível a leitor de tela.
 * Até o Torph chegar (P-512), e sempre com movimento reduzido no 1º render, é texto simples no mesmo elemento.
 */
export function Morph({ children, as = 'span' }: { children: string; as?: 'span' | 'p' }) {
  const reduced = useAppReducedMotion();
  const M = useTextMorph();
  if (!M) return createElement(as, null, children);
  return (
    <M as={as} locale="pt-BR" duration={320} ease="cubic-bezier(0.19, 1, 0.22, 1)" respectReducedMotion disabled={reduced}>
      {children}
    </M>
  );
}
