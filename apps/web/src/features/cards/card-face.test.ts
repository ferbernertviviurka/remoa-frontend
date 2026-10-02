import { describe, expect, it } from 'vitest';
import { sepseCards } from '@remoa/contracts/mocks';
import { cardFace } from './card-face';

const [concept] = sepseCards;
const asset = '00000000-0000-4000-8000-000000000777';

describe('cardFace (T6)', () => {
  it('concept: the front (question) on the face, the answer only for the back (D-097)', () => {
    expect(cardFace({ ...concept!, front: 'O que é *sepse*?', back: '**Disfunção** orgânica' }, null)).toMatchObject({ summary: 'O que é sepse?', answer: 'Disfunção orgânica', meta: null });
    expect(cardFace({ ...concept!, front: null, back: 'x' }, null).summary).toBeNull();
    expect(cardFace({ ...concept!, back: null, front: null }, null).summary).toBeNull();
  });
  it('flow: step count; case: stage chips in pt-BR', () => {
    expect(cardFace({ ...concept!, type: 'flow', preview: { steps: 3 } }, null).meta).toBe('3 passos');
    expect(cardFace({ ...concept!, type: 'flow', preview: { steps: 0 } }, null).meta).toBeNull();
    expect(cardFace({ ...concept!, type: 'case', preview: { stages: ['presentation', 'management'] } }, null).chips).toEqual(['Apresentação', 'Conduta']);
  });
  it('image: thumbnail (icon until the url arrives) + mask count', () => {
    const img = { ...concept!, type: 'image' as const, title: 'Coração' };
    expect(cardFace(img, null)).toMatchObject({ meta: null, thumbnail: { src: null, alt: 'Imagem do card Coração' } });
    expect(cardFace({ ...img, preview: { assetId: asset, masks: 1 } }, 'https://x/800.webp')).toMatchObject({ meta: '1 máscara', thumbnail: { src: 'https://x/800.webp' } });
    expect(cardFace({ ...img, preview: { assetId: asset, masks: 3 } }, null).meta).toBe('3 máscaras');
  });
});
