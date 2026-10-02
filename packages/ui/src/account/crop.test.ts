import { AVATAR_MAX_BYTES, clampOffset, clampZoom, scaleFor, sourceRect, validateAvatarFile } from './crop';

describe('validateAvatarFile', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('aceita %s', (type) => {
    expect(validateAvatarFile({ type, size: 1000 })).toEqual({ ok: true });
  });
  it('recusa outros tipos', () => {
    expect(validateAvatarFile({ type: 'image/gif', size: 10 })).toEqual({ ok: false, reason: 'type' });
    expect(validateAvatarFile({ type: '', size: 10 })).toEqual({ ok: false, reason: 'type' });
  });
  it('5 MB passa, acima não', () => {
    expect(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES }).ok).toBe(true);
    expect(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES + 1 })).toEqual({ ok: false, reason: 'size' });
  });
  it('tipo inválido vence tamanho', () => {
    expect(validateAvatarFile({ type: 'text/plain', size: AVATAR_MAX_BYTES * 2 })).toEqual({ ok: false, reason: 'type' });
  });
});

describe('clampZoom', () => {
  it('limita a 100–200 e arredonda a 5', () => {
    expect(clampZoom(50)).toBe(100);
    expect(clampZoom(250)).toBe(200);
    expect(clampZoom(123)).toBe(125);
    expect(clampZoom(122)).toBe(120);
    expect(clampZoom(NaN)).toBe(100);
  });
});

describe('recorte', () => {
  it('escala cobre o lado menor', () => {
    expect(scaleFor(400, 200, 240, 100)).toBeCloseTo(1.2);
    expect(scaleFor(400, 200, 240, 200)).toBeCloseTo(2.4);
  });
  it('sem deslocamento recorta o centro (quadrado do lado menor no zoom 100)', () => {
    const r = sourceRect({ x: 0, y: 0 }, 400, 200, 240, 100);
    expect(r.sw).toBeCloseTo(200);
    expect(r.sh).toBeCloseTo(200);
    expect(r.sx).toBeCloseTo(100);
    expect(r.sy).toBeCloseTo(0);
  });
  it('zoom 200 recorta metade do lado, centrado', () => {
    const r = sourceRect({ x: 0, y: 0 }, 200, 200, 240, 200);
    expect(r).toEqual({ sx: 50, sy: 50, sw: 100, sh: 100 });
  });
  it('limita o deslocamento para a imagem cobrir a área', () => {
    expect(clampOffset({ x: 999, y: 999 }, 200, 200, 240, 100)).toEqual({ x: 0, y: 0 });
    const o = clampOffset({ x: 999, y: -999 }, 400, 200, 240, 100);
    expect(o).toEqual({ x: 120, y: 0 });
    expect(clampOffset({ x: 999, y: -999 }, 200, 200, 240, 200)).toEqual({ x: 120, y: -120 });
  });
  it('arrastar para a direita mostra a esquerda da imagem e nunca sai dos limites', () => {
    const r = sourceRect({ x: 120, y: 0 }, 400, 200, 240, 100);
    expect(r.sx).toBeCloseTo(0);
    const far = sourceRect({ x: 5000, y: 0 }, 400, 200, 240, 100);
    expect(far.sx).toBeCloseTo(0);
  });
});
