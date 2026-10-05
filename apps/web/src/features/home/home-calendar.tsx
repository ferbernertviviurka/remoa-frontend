'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import type { UpcomingEvents } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { CalendarBanner, UpcomingEventsCard, dayKeyOf } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { labelsOfUpcoming, upcomingItem } from '@/features/calendar/model';
import { count, text } from '@/features/calendar/text';

const HREF = '/app/calendario';
const tracked = (target: 'banner' | 'card') =>
  function TrackedLink(props: ComponentProps<typeof Link>) {
    return <Link {...props} onClick={() => track('calendar_home_card_clicked', { target })} />;
  };
const BannerLink = tracked('banner');
const CardLink = tracked('card');

/** F25 FR-17: faixa âmbar quando há compromisso hoje ou amanhã ("Amanhã às 08:00: Prova de Clínica Médica"). */
export function CalendarStrip({ upcoming }: { upcoming: UpcomingEvents }) {
  const e = upcoming.events.find((x) => x.daysUntil <= 1);
  if (!e) return null;
  const today = e.daysUntil === 0;
  const key = e.allDay ? (today ? 'todayAllDay' : 'tomorrowAllDay') : today ? 'todayAt' : 'tomorrowAt';
  const when = t(`calendar.banner.${key}`, { time: e.startTime ?? '' });
  return (
    <CalendarBanner
      as={BannerLink}
      href={HREF}
      ariaLabel={t('calendar.banner.ariaLabel')}
      headline={t('calendar.banner.headline', { when, title: e.title })}
      detail={[e.labelName, e.location].filter(Boolean).join(' · ')}
      cta={t('calendar.banner.cta')}
    />
  );
}

/** F25 FR-17: card "Próximos compromissos" (4), com estado vazio e "Adicionar compromisso". `timeZone` = o do perfil. */
export function UpcomingCard({ upcoming, timeZone, now }: { upcoming: UpcomingEvents; timeZone: string; now: Date }) {
  return (
    <UpcomingEventsCard
      as={CardLink}
      href={HREF}
      events={upcoming.events.map(upcomingItem)}
      labels={labelsOfUpcoming(upcoming.events)}
      today={dayKeyOf(now, timeZone)}
      timeZone={timeZone}
      text={{ ...text.upcoming, count }}
    />
  );
}
