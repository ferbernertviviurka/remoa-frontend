import type { NotificationGroup, NotificationView } from './types';
import type { PrefRow } from './prefs';

/** Dados de exemplo (Main.dc.html) para stories e testes. O app usa `@remoa/strings` (notifications.*); `ui` não depende do pacote. */
const C = { calendar: 'Calendário', review: 'Revisão', maps: 'Mapas', referrals: 'Indicações', support: 'Suporte', account: 'Conta e cobrança', store: 'Loja' } as const;
const cat = (k: keyof typeof C) => C[k];

export const sample: ReadonlyArray<NotificationView> = [
  { id: 'n1', kind: 'calendar', title: 'Amanhã: Prova de Clínica Médica', body: '08:00 – 12:00 · Anfiteatro 2', when: 'há 2 h', category: cat('calendar'), href: '/calendario', unread: true },
  { id: 'n2', kind: 'review', title: '12 cards esperam por você hoje', body: 'Cerca de 5 minutos para fixar o que vence.', when: 'há 3 h', category: cat('review'), href: '/revisar', unread: true },
  { id: 'n3', kind: 'calendar', title: 'Hoje às 19:00: Grupo de estudo', body: 'Biblioteca central', when: 'há 6 h', category: cat('calendar'), href: '/calendario', unread: false },
  { id: 'n4', kind: 'map', title: 'Seu mapa Pneumonia está pronto', body: '29 cards e 33 conexões. Revise antes de estudar.', when: 'ontem', category: cat('maps'), href: '/mapas/1', unread: true },
  { id: 'n5', kind: 'referral', title: 'Carla criou o primeiro mapa', body: 'Vocês dois ganharam 1 mês de Pro.', when: 'ontem', category: cat('referrals'), href: '/indicar', unread: false },
  { id: 'n6', kind: 'support', title: 'Resposta no chamado #1038', body: 'A equipe respondeu sobre a importação do .apkg.', when: '1 out', category: cat('support'), href: '/suporte', unread: false },
  { id: 'n7', kind: 'purchase', title: 'Pagamento confirmado', body: 'Pro mensal. O comprovante foi enviado por e-mail.', when: '30 set', category: cat('account'), href: '/conta', unread: false },
  { id: 'n8', kind: 'store', title: 'Você está na lista da Loja de mapas', body: 'Avisamos por e-mail quando ela abrir.', when: '29 set', category: cat('store'), href: '/loja', unread: false },
];

const grp = (id: string, label: string, ids: string[], items: ReadonlyArray<NotificationView>): NotificationGroup => ({ id, label, items: items.filter((i) => ids.includes(i.id)) });

export const groupsOf = (items: ReadonlyArray<NotificationView>): NotificationGroup[] => [
  grp('today', 'Hoje', ['n1', 'n2', 'n3'], items), grp('yesterday', 'Ontem', ['n4', 'n5'], items), grp('week', 'Esta semana', ['n6', 'n7'], items), grp('before', 'Antes', ['n8'], items),
];

export const formatMeta = (i: NotificationView) => `${i.when} · ${i.category}`;

const PREF_TEXT: Record<string, [string, string]> = {
  calendarD1: ['Compromissos: 1 dia antes', 'Às 18:00 do dia anterior'],
  calendarD0: ['Compromissos: no dia', 'Às 07:00 do dia'],
  review: ['Lembrete de revisão', 'Quando houver cards para revisar'],
  mapReady: ['Mapa pronto', 'Quando um mapa gerado terminar'],
  inactivity: ['Volte quando sumir', 'Depois de mais de 10 dias sem entrar'],
  referral: ['Indicações', 'Quando um amigo libera Pro'],
  support: ['Suporte', 'Respostas aos seus chamados'],
  account: ['Conta e cobrança', 'Cadastro, compras e senha'],
  store: ['Loja de mapas', 'Lista de espera e abertura'],
};

export const prefRows = (pause = false): PrefRow[] => [
  { id: 'calendarD1', app: true, email: true, muted: pause },
  { id: 'calendarD0', app: true, email: true, muted: pause },
  { id: 'review', app: true, email: true, muted: pause },
  { id: 'mapReady', app: true, email: true },
  { id: 'inactivity', app: null, email: true, muted: pause },
  { id: 'referral', app: true, email: true },
  { id: 'support', app: true, email: true, emailLocked: true },
  { id: 'account', app: true, email: true, emailLocked: true },
  { id: 'store', app: true, email: true },
].map((r) => ({ ...r, title: PREF_TEXT[r.id]![0], description: PREF_TEXT[r.id]![1] }));
