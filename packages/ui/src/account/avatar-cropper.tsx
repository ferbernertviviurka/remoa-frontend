'use client';

import { useImperativeHandle, useRef, useState, type KeyboardEvent, type PointerEvent, type Ref } from 'react';
import { AVATAR_OUT, AVATAR_QUALITY, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, clampOffset, clampZoom, scaleFor, sourceRect, type Offset } from './crop';

/**
 * AvatarCropper: área quadrada (240 px) com guia circular. Arraste (pointer) ou use as setas (10 px; Shift = 40)
 * para posicionar; zoom 100–200% em passo de 5 (range). `src` = URL da imagem (ex.: object URL já validada com
 * `validateAvatarFile`). `ref.exportBlob()` devolve WebP 512 × 512 (qualidade 0,85) ou null se a imagem não carregou.
 * `onChange` dispara em cada ajuste (para habilitar "Salvar foto"). Rótulos por props.
 */
export type AvatarCropperHandle = { exportBlob: () => Promise<Blob | null> };
export type AvatarCropperProps = {
  src: string;
  areaLabel: string;
  zoomLabel: string;
  onChange?: () => void;
  ref?: Ref<AvatarCropperHandle>;
};

const BOX = 240;
const NUDGE = 10;

export function AvatarCropper({ src, areaLabel, zoomLabel, onChange, ref }: AvatarCropperProps) {
  const img = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [off, setOff] = useState<Offset>({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; o: Offset } | null>(null);

  const move = (o: Offset, z = zoom) => {
    if (!size) return;
    setOff(clampOffset(o, size.w, size.h, BOX, z));
    onChange?.();
  };

  useImperativeHandle(ref, () => ({
    exportBlob: () =>
      new Promise((resolve) => {
        const el = img.current;
        if (!el || !size) return resolve(null);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = AVATAR_OUT;
        const r = sourceRect(off, size.w, size.h, BOX, zoom);
        canvas.getContext('2d')?.drawImage(el, r.sx, r.sy, r.sw, r.sh, 0, 0, AVATAR_OUT, AVATAR_OUT);
        canvas.toBlob((b) => resolve(b), 'image/webp', AVATAR_QUALITY);
      }),
  }));

  const onKey = (e: KeyboardEvent) => {
    const d = e.shiftKey ? NUDGE * 4 : NUDGE;
    const delta: Record<string, Offset> = { ArrowLeft: { x: -d, y: 0 }, ArrowRight: { x: d, y: 0 }, ArrowUp: { x: 0, y: -d }, ArrowDown: { x: 0, y: d } };
    const v = delta[e.key];
    if (!v) return;
    e.preventDefault();
    move({ x: off.x + v.x, y: off.y + v.y });
  };
  const onDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, o: off };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (d) move({ x: d.o.x + e.clientX - d.x, y: d.o.y + e.clientY - d.y });
  };

  const s = size ? scaleFor(size.w, size.h, BOX, zoom) : 1;
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        role="group"
        aria-label={areaLabel}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        style={{ width: BOX, height: BOX, touchAction: 'none' }}
        className="relative cursor-grab select-none overflow-hidden rounded-[20px] bg-navy outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing"
      >
        <img
          ref={img}
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          data-testid="crop-image"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            maxWidth: 'none',
            width: size ? size.w * s : undefined,
            height: size ? size.h * s : undefined,
            transform: `translate(-50%, -50%) translate(${off.x}px, ${off.y}px)`,
          }}
        />
        <span aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-pill border-2 border-dashed border-white/80" />
      </div>
      <input
        type="range"
        aria-label={zoomLabel}
        aria-valuetext={`${zoom}%`}
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={ZOOM_STEP}
        value={zoom}
        onChange={(e) => {
          const z = clampZoom(Number(e.target.value));
          setZoom(z);
          move(off, z);
        }}
        className="h-11 w-60 accent-[var(--primary)]"
      />
    </div>
  );
}
