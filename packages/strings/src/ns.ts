/** G21 P-507 (D-1069): namespaces fora do núcleo, um módulo cada. Num componente cliente: `const t = withStrings({ cards: more.cards })` com `import * as more from '@remoa/strings/ns'`; a página só leva os módulos citados. */
export { account } from './account';
export { plans } from './plans';
export { onboarding, cardStudy } from './onboarding';
export { personal } from './personal';
export { mapMobile } from './map-mobile';
export { challenge } from './ns-parts/challenge';
export { canvas } from './ns-parts/canvas';
export { home } from './ns-parts/home';
export { newMap } from './ns-parts/new-map';
export { progress } from './ns-parts/progress';
export { editorial } from './ns-parts/editorial';
export { devEmails } from './ns-parts/dev-emails';
export { boards } from './ns-parts/boards';
export { coverage } from './ns-parts/coverage';
export { inspector } from './ns-parts/inspector';
export { map } from './ns-parts/map';
export { cards } from './ns-parts/cards';
export { ai } from './ns-parts/ai';
