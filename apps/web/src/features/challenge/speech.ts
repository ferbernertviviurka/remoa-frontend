'use client';

import { useEffect, useState } from 'react';

type Rec = {
  lang: string;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type Ctor = new () => Rec;

function ctor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** pt-BR dictation into the answer field. Audio never leaves the browser. `start` is false when the browser refuses to listen. */
export function useSpeech(onText: (text: string) => void, onFail?: () => void) {
  const [supported, setSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  useEffect(() => setSupported(ctor() != null), []);
  const start = () => {
    const C = ctor();
    if (!C) return false;
    const rec = new C();
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    let settled = false;
    rec.onresult = (ev) => {
      if (settled) return;
      settled = true;
      const text = ev.results[0]?.[0]?.transcript ?? '';
      setTranscript(text);
      onText(text);
    };
    rec.onerror = () => {
      if (settled) return;
      settled = true;
      onFail?.();
    };
    rec.onend = () => {
      if (settled) return;
      settled = true;
      onFail?.();
    };
    try {
      rec.start();
      return true;
    } catch {
      return false;
    }
  };
  return { supported, transcript, start };
}
