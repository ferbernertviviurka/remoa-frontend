import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useSpeech } from './speech';

function Probe({ onText, onFail }: { onText: (text: string) => void; onFail: () => void }) {
  const speech = useSpeech(onText, onFail);
  return <button type="button" onClick={() => { if (!speech.start()) onFail(); }}>gravar</button>;
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'SpeechRecognition');
});

describe('useSpeech', () => {
  it('puts the pt-BR transcript in the field and does not report a failure after a result', () => {
    const onText = vi.fn();
    const onFail = vi.fn();
    class Fake {
      lang = '';
      interimResults = false;
      onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        expect(this.lang).toBe('pt-BR');
        this.onresult?.({ results: [[{ transcript: 'noradrenalina' }]] });
        this.onend?.();
      }
      stop() {}
    }
    (window as unknown as { SpeechRecognition: typeof Fake }).SpeechRecognition = Fake;
    render(<Probe onText={onText} onFail={onFail} />);
    fireEvent.click(screen.getByRole('button', { name: 'gravar' }));
    expect(onText).toHaveBeenCalledWith('noradrenalina');
    expect(onFail).not.toHaveBeenCalled();
  });

  it('counts a blank transcript as a failure and does not fill the field', () => {
    const onText = vi.fn();
    const onFail = vi.fn();
    class Fake {
      lang = '';
      interimResults = false;
      onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        this.onresult?.({ results: [[{ transcript: '   ' }]] });
        this.onend?.();
      }
      stop() {}
    }
    (window as unknown as { SpeechRecognition: typeof Fake }).SpeechRecognition = Fake;
    render(<Probe onText={onText} onFail={onFail} />);
    fireEvent.click(screen.getByRole('button', { name: 'gravar' }));
    expect(onText).not.toHaveBeenCalled();
    expect(onFail).toHaveBeenCalledTimes(1);
  });
});
