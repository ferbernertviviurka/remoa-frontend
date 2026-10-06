import { describe, expect, it } from 'vitest';
import { CARD_SIZE_MAX } from '@remoa/contracts';
import { desktopFrame, fitToImages, hasNewImage, imageIdsOf } from './image-fit';

const card = (o: Partial<Parameters<typeof imageIdsOf>[0]> = {}) => ({ type: 'concept' as const, frontAssetId: null, backAssetId: null, ...o });

describe('imagem cabe no card (D-1211)', () => {
  it('lista as imagens do card: do card de imagem, da pergunta e, no desktop, da resposta', () => {
    expect(imageIdsOf(card({ type: 'image', preview: { assetId: 'a' } }))).toEqual(['a']);
    expect(imageIdsOf(card({ frontAssetId: 'f', backAssetId: 'b' }))).toEqual(['f', 'b']);
    expect(imageIdsOf(card({ frontAssetId: 'f', backAssetId: 'b' }), false)).toEqual(['f']);
  });
  it('só reage a imagem nova ou trocada', () => {
    expect(hasNewImage(card(), card({ frontAssetId: 'f' }))).toBe(true);
    expect(hasNewImage(card({ frontAssetId: 'f' }), card({ frontAssetId: 'f' }))).toBe(false);
    expect(hasNewImage(card({ frontAssetId: 'f' }), card({ frontAssetId: 'g' }))).toBe(true);
    expect(hasNewImage(card({ frontAssetId: 'f' }), card())).toBe(false);
  });
  it('imagem em pé aumenta a altura mantendo a largura; a imagem inteira cabe na proporção', () => {
    const f = desktopFrame({ type: 'concept', shape: 'rect' });
    const next = fitToImages({ w: 232, h: 240 }, [{ width: 600, height: 800 }], f)!;
    expect(next.w).toBe(232);
    expect(next.h % 8).toBe(0);
    expect(next.h - f.chrome).toBeGreaterThanOrEqual(((232 - f.padX) * 800) / 600);
  });
  it('card de imagem: a imagem ocupa o lugar da faixa de 84 px', () => {
    const f = desktopFrame({ type: 'image', shape: 'rect' });
    expect(f.chrome).toBe(206 - 84);
    expect(fitToImages({ w: 248, h: 206 }, [{ width: 1000, height: 1000 }], f)).toEqual({ w: 248, h: 336 });
  });
  it('imagem deitada que já cabe não muda nada; acima do máximo do contrato para no máximo', () => {
    const f = desktopFrame({ type: 'concept', shape: 'rect' });
    expect(fitToImages({ w: 232, h: 240 }, [{ width: 2000, height: 200 }], f)).toBeNull();
    expect(fitToImages({ w: 640, h: 240 }, [{ width: 100, height: 2000 }], f)!.h).toBe(CARD_SIZE_MAX.h);
  });
  it('várias imagens: vale a mais alta; dimensões inválidas são ignoradas', () => {
    const f = desktopFrame({ type: 'concept', shape: 'rect' });
    const tall = fitToImages({ w: 232, h: 150 }, [{ width: 1000, height: 500 }, { width: 500, height: 1000 }], f)!;
    expect(tall).toEqual(fitToImages({ w: 232, h: 150 }, [{ width: 500, height: 1000 }], f));
    expect(fitToImages({ w: 232, h: 150 }, [{ width: 0, height: 0 }], f)).toBeNull();
  });
});
