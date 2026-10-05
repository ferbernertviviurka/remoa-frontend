'use client';

import { useState } from 'react';
import { Dropzone } from '../dropzone';
import { focusRing } from '../button-styles';

export const COVER_MAX_BYTES = 5 * 1024 * 1024;
const COVER_TYPES = ['image/png', 'image/jpeg'];

/** PNG ou JPG até 5 MB (F25 FR-10). */
export function validateCoverFile(file: { type: string; size: number }): 'type' | 'size' | null {
  if (!COVER_TYPES.includes(file.type)) return 'type';
  return file.size > COVER_MAX_BYTES ? 'size' : null;
}

/**
 * CoverUpload (F25 FR-10): sem imagem, `Dropzone` compacto; com imagem, prévia no corte 16:9 (`object-cover`) com Trocar e Remover.
 * Valida tipo e tamanho antes de chamar `onFile` (quem chama cria a URL de prévia e faz o upload; o recorte final 16:9 é do servidor).
 */
export type CoverUploadProps = {
  value?: { name: string; url: string } | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  text: { title: string; description: string; button: string; replace: string; remove: string; preview: string; errorType: string; errorSize: string };
};

export function CoverUpload({ value, onFile, onRemove, text }: CoverUploadProps) {
  const [error, setError] = useState<'type' | 'size' | null>(null);
  const take = (files: FileList) => {
    const f = files[0];
    if (!f) return;
    const e = validateCoverFile(f);
    setError(e);
    if (!e) onFile(f);
  };
  const btn = `min-h-11 rounded-[12px] border border-border-strong bg-surface px-3.5 text-[13px] font-bold ${focusRing}`;
  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="flex flex-col gap-2.5">
          <img src={value.url} alt={text.preview} className="aspect-video w-full rounded-[18px] border border-border object-cover" />
          <div className="flex items-center gap-2">
            <span className="min-w-0 grow truncate text-[13px] text-muted">{value.name}</span>
            <label className={`${btn} flex cursor-pointer items-center`}>
              {text.replace}
              <input type="file" accept={COVER_TYPES.join(',')} className="sr-only" onChange={(e) => { if (e.target.files) take(e.target.files); e.target.value = ''; }} />
            </label>
            <button type="button" onClick={onRemove} className={btn}>{text.remove}</button>
          </div>
        </div>
      ) : (
        <Dropzone compact title={text.title} description={text.description} buttonLabel={text.button} accept={COVER_TYPES.join(',')} onFiles={take} />
      )}
      {error ? <span role="alert" className="text-[13px] font-semibold text-review-text">{error === 'type' ? text.errorType : text.errorSize}</span> : null}
    </div>
  );
}
