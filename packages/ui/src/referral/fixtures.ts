import type { MapFriend } from './referral-map';

/** Dados de exemplo para stories e testes (os mesmos do mock `Indicar.dc.html`). Textos de exemplo, não vão ao produto. */
export const friendsAndamento: MapFriend[] = [
  { id: 'ana', name: 'Ana C.', status: 'qualified' },
  { id: 'bruno', name: 'Bruno M.', status: 'qualified' },
  { id: 'carla', name: 'Carla S.', status: 'signed_up' },
  { id: 'diego', name: 'd***@gmail.com', status: 'invited' },
];
export const friendsMuitos: MapFriend[] = [
  ...friendsAndamento,
  { id: 'elisa', name: 'Elisa R.', status: 'qualified' },
  { id: 'felipe', name: 'Felipe T.', status: 'qualified' },
  { id: 'gabi', name: 'Gabi L.', status: 'qualified' },
  { id: 'hugo', name: 'Hugo P.', status: 'qualified' },
];
export const statusLabels = { qualified: 'Primeiro mapa criado', signed_up: 'Cadastrou', invited: 'Convite enviado' } as const;
export const heroArt = { you: 'Você', friend: 'Amigo', reward: '1 mês de Pro', badge: '+1 mês' };
