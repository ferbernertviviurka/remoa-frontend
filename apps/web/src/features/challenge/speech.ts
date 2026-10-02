'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Rec = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start: () => void; stop: () => void;
};
const ctor = (): (new () => Rec) | undefined => {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

/**
 * "Falar" (D-091): the browser transcribes (Web Speech API, pt-BR). Remoa records and stores nothing (no MediaRecorder, no upload);
 * only the text leaves. `interim` is what is being heard; `onFinal` gets the final transcript when listening ends.
 */
export function useSpeech(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [failed, setFailed] = useState(false);
  const rec = useRef<Rec | null>(null);
  const heard = useRef('');
  const final = useRef(onFinal);
  final.current = onFinal;
  useEffect(() => {
    setSupported(!!ctor());
    return () => rec.current?.stop();
  }, []);

  const start = useCallback(() => {
    const C = ctor();
    if (!C) return;
    const r = new C();
    r.lang = 'pt-BR';
    r.interimResults = true;
    r.continuous = false;
    heard.current = '';
    setFailed(false);
    r.onresult = (e) => {
      heard.current = Array.from(e.results, (x) => x[0]!.transcript).join(' ').trim();
      setInterim(heard.current);
    };
    r.onerror = () => setFailed(true);
    r.onend = () => {
      setListening(false);
      setInterim('');
      rec.current = null;
      if (heard.current) final.current(heard.current);
    };
    rec.current = r;
    setListening(true);
    r.start();
  }, []);
  const stop = useCallback(() => rec.current?.stop(), []);
  return { supported, listening, interim, failed, start, stop };
}
