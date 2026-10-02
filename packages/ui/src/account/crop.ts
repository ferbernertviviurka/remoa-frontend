/** Matemática pura do recorte de avatar e validação de arquivo (sem DOM). */

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_OUT = 512;
export const AVATAR_QUALITY = 0.85;
export const ZOOM_MIN = 100;
export const ZOOM_MAX = 200;
export const ZOOM_STEP = 5;

export type FileCheck = { ok: true } | { ok: false; reason: 'type' | 'size' };

/** JPG, PNG ou WebP, até 5 MB (5 × 1024²). */
export function validateAvatarFile(file: { type: string; size: number }): FileCheck {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return { ok: false, reason: 'type' };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, reason: 'size' };
  return { ok: true };
}

/** Zoom em % limitado a 100–200 e arredondado ao passo de 5. */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return ZOOM_MIN;
  const snapped = Math.round(zoom / ZOOM_STEP) * ZOOM_STEP;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, snapped));
}

/** Escala (px por px da imagem) com que a imagem cobre a área quadrada de lado `box` no zoom 100%, vezes o zoom. */
export function scaleFor(imgW: number, imgH: number, box: number, zoom: number): number {
  return (box / Math.min(imgW, imgH)) * (clampZoom(zoom) / 100);
}

export type Offset = { x: number; y: number };

/** `offset` = deslocamento do centro da imagem em relação ao centro da área (px). Mantém a imagem cobrindo a área. */
export function clampOffset(offset: Offset, imgW: number, imgH: number, box: number, zoom: number): Offset {
  const s = scaleFor(imgW, imgH, box, zoom);
  const mx = Math.max(0, (imgW * s - box) / 2);
  const my = Math.max(0, (imgH * s - box) / 2);
  return { x: Math.min(mx, Math.max(-mx, offset.x)) + 0, y: Math.min(my, Math.max(-my, offset.y)) + 0 }; // + 0 evita -0
}

/** Retângulo da imagem original (em px dela) que fica visível na área. */
export function sourceRect(offset: Offset, imgW: number, imgH: number, box: number, zoom: number) {
  const s = scaleFor(imgW, imgH, box, zoom);
  const o = clampOffset(offset, imgW, imgH, box, zoom);
  const side = box / s;
  return { sx: imgW / 2 - (box / 2 + o.x) / s, sy: imgH / 2 - (box / 2 + o.y) / s, sw: side, sh: side };
}
