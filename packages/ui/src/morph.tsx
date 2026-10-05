'use client';

import { useEffect, useState } from 'react';
import { TextMorph } from 'torph/react';

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
 */
export function Morph({ children, as = 'span' }: { children: string; as?: 'span' | 'p' }) {
  const reduced = useAppReducedMotion();
  return (
    <TextMorph as={as} locale="pt-BR" duration={320} ease="cubic-bezier(0.19, 1, 0.22, 1)" respectReducedMotion disabled={reduced}>
      {children}
    </TextMorph>
  );
}
