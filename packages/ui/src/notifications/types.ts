// Tipos locais e apresentacionais (F26). Se `@remoa/contracts` ganhar `notifications`, o app mapeia o contrato para estes.
export type NotificationKind = 'calendar' | 'review' | 'map' | 'referral' | 'support' | 'purchase' | 'store' | 'account';

export type NotificationView = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** "há 2 h", "ontem", "1 out" (já formatado) */
  when: string;
  category: string;
  href: string;
  unread: boolean;
};

export type NotificationGroup = { id: string; label: string; items: ReadonlyArray<NotificationView> };
