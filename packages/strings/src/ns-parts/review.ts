// P-512 (D-1079): `review` do núcleo + `review.hub` (tela Revisar), fora do núcleo: `withStrings({ review: more.review })`.
import { ptBRCore } from '../core-dict';
import { reviewHub } from '../review';

export const review = { ...ptBRCore.review, hub: reviewHub };
