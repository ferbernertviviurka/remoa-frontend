'use client';

import type { RefObject } from 'react';
import { strings } from '@remoa/strings/landing';

const c = strings.landing.calendar;
const legendAnim = ['calK28', 'calK29', 'calK30'];
const rowAnim = ['calK20', 'calK21', 'calK22'];
const upAnim = ['calK23', 'calK24', 'calK25'];
const kindTone: Record<string, string> = {
  Prova: 'bg-[#FFEDD5] text-[#9A3412]',
  Trabalho: 'bg-[#FEF3C7] text-[#854D0E]',
  Pessoal: 'bg-[#EEEDF6] text-muted',
  Plantão: 'bg-[#CCFBF1] text-[#0F766E]',
};
const dayChip: Record<number, { anim: string; tone: string; label: string }> = {
  9: { anim: 'calK4', tone: 'border-l-4 border-[#C2410C] bg-[#FFEDD5]', label: c.chips.exam },
  16: { anim: 'calK5', tone: 'border-l-4 border-[#CA8A04] bg-[#FEF3C7]', label: c.chips.work },
  22: { anim: 'calK6', tone: 'border-l-4 border-primary bg-[#F3F2FB]', label: c.chips.deadline },
};

const cells: ({ day: number } | null)[] = [...Array.from({ length: 4 }, () => null), ...Array.from({ length: 31 }, (_, i) => ({ day: i + 1 }))];

/** 15s CSS loop. The step list outside this player is the text alternative. */
export function CalendarPlayer({ playerRef }: { playerRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={playerRef} className="caDemo relative w-full overflow-hidden rounded-[36px] border border-border bg-canvas shadow-[0_40px_90px_rgba(36,26,92,0.16)]" role="img" aria-label={c.playerLabel}>
      <div aria-hidden className="absolute inset-0 flex flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-4 md:h-16 md:gap-3 md:px-6">
          <i className="h-3 w-3 rounded-full bg-[#FDBA74]" />
          <i className="h-3 w-3 rounded-full bg-[#FCD34D]" />
          <i className="h-3 w-3 rounded-full bg-[#C9BFFF]" />
          <span className="ml-1 min-w-0 truncate text-[13px] font-bold text-muted md:ml-2.5 md:text-sm">{c.windowTitle}</span>
          <span className="ml-auto shrink-0 rounded-full bg-[#F3F2FB] px-2.5 py-0.5 text-[11.5px] font-extrabold text-primary-deep">{c.preview}</span>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="ca-sc ca-sc1 k calK1 absolute inset-0 flex flex-col gap-3 p-4 md:gap-3.5 md:px-8 md:py-5">
            <div className="k calK7 flex items-center gap-2.5">
              <div className="flex h-11 min-w-0 flex-1 items-center rounded-[15px] border-2 border-primary bg-surface px-3 md:h-[50px] md:px-4">
                <span className="k calK8 block truncate text-[14px] font-bold md:text-[15.5px]">{c.field}</span>
              </div>
              <span className="k calK9 hidden rounded-full bg-[#FFEDD5] px-3.5 py-1.5 text-[13px] sm:inline font-extrabold text-[#9A3412]">{c.chips.exam}</span>
              <span className="k calK10 flex h-11 shrink-0 items-center rounded-[15px] bg-primary px-4 text-[14px] md:h-[50px] md:px-5 md:text-[14.5px] font-extrabold text-white">{c.save}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-extrabold tracking-[-0.02em] text-ink md:text-[22px]">{c.month}</span>
              <span className="hidden text-[12.5px] font-bold text-ink sm:inline">{c.views}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 md:gap-[5px]">
              {c.weekdays.map((d, i) => <span key={`${d}-${i}`} className="text-center text-[11.5px] font-extrabold tracking-wider text-muted">{d}</span>)}
              {cells.map((cell, i) => {
                const chip = cell ? dayChip[cell.day] : undefined;
                const today = cell?.day === 7;
                return (
                  <span key={i} className="relative h-12 rounded-lg border border-[#EEEBF8] bg-surface md:h-[60px] md:rounded-[10px]">
                    {today ? <span className="absolute top-0.5 left-[3px] h-[18px] w-[18px] rounded-full bg-primary md:top-1 md:left-[5px] md:h-[22px] md:w-[22px]" /> : null}
                    {cell ? <span className={`relative block px-1.5 pt-0.5 text-[11px] font-bold md:px-2 md:pt-1 md:text-xs ${today ? 'text-white' : 'text-ink'}`}>{cell.day}</span> : null}
                    {chip ? <span className={`k ${chip.anim} absolute right-1 bottom-1 left-1 flex h-1.5 items-center overflow-hidden rounded-md text-[10.5px] font-extrabold text-ink md:bottom-[5px] md:h-[18px] md:pr-1 md:pl-1.5 ${chip.tone}`}><span className="hidden truncate md:inline">{chip.label}</span></span> : null}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="ca-sc ca-sc2 k calK2 absolute inset-0 flex flex-col gap-3 p-4 md:flex-row md:gap-5 md:px-8 md:py-6">
            <div className="k calK11 flex shrink-0 flex-col gap-1.5 self-stretch rounded-3xl border border-border bg-surface px-4 py-3.5 md:w-[46%] md:self-start md:px-5 md:py-4 shadow-[0_14px_34px_rgba(36,26,92,0.1)]">
              <span className="self-start rounded-full bg-[#FFEDD5] px-2.5 py-0.5 text-xs font-extrabold text-[#9A3412]">{c.chips.exam}</span>
              <span className="font-display text-lg font-extrabold tracking-[-0.02em] md:text-xl">{c.field}</span>
              <span className="text-[13.5px] text-muted">{c.when}</span>
              <span className="mt-1.5 text-xs font-extrabold tracking-wider text-muted uppercase md:mt-2.5">{c.notify}</span>
              <Toggle label={c.dayBefore} fill="calFill1" knob="calK13" />
              <Toggle label={c.sameDay} fill="calFill2" knob="calK15" />
            </div>
            <div className="flex flex-1 flex-col items-center gap-4">
              <div className="k calK16 relative hidden h-[84px] w-[84px] md:flex items-center justify-center rounded-full bg-[#F3F2FB] text-primary-deep">
                <span className="k calK17 block origin-[50%_12%]">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15z" /><path d="M10 21a2 2 0 004 0" /></svg>
                </span>
                <i className="k calK18 absolute top-3.5 right-4 h-4 w-4 rounded-full border-[3px] border-[#F3F2FB] bg-[#C2410C]" />
              </div>
              <div className="k calK19 flex w-full flex-col gap-1 rounded-[22px] border border-border bg-surface px-4 py-3 md:py-4 shadow-[0_18px_40px_rgba(36,26,92,0.14)]">
                <span className="text-xs font-extrabold tracking-wide text-[#C2410C] uppercase">{c.tomorrow}</span>
                <span className="text-base font-extrabold">{c.noticeTitle}</span>
                <span className="text-[13.5px] text-muted">{c.noticeWhere}</span>
              </div>
            </div>
          </div>
          <div className="ca-sc ca-sc3 k calK3 absolute inset-0 flex flex-col gap-3 p-4 md:flex-row md:gap-5 md:px-8 md:py-6">
            <div className="k calK26 shrink-0 rounded-3xl border border-border bg-surface px-4 py-3 md:w-[52%] md:self-start md:px-5 md:py-4 shadow-[0_14px_34px_rgba(36,26,92,0.1)]">
              <span className="text-[11.5px] font-extrabold tracking-wider text-muted uppercase">{c.email}</span>
              <span className="mt-1 mb-1.5 block font-display text-[17px] leading-tight md:mb-2 md:text-[19px] font-extrabold tracking-[-0.02em]">{c.emailTitle}</span>
              {c.rows.map((row, i) => (
                <div key={row.time} className={`k ${rowAnim[i]} flex items-center gap-2.5 border-t border-[#EEEBF8] py-1.5 md:py-2`}>
                  <span className="w-[46px] shrink-0 text-[13px] font-extrabold text-muted">{row.time}</span>
                  <span className="min-w-0 flex-1 text-[13.5px] font-bold">{row.title}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${kindTone[row.kind]}`}>{row.kind}</span>
                </div>
              ))}
            </div>
            <div className="k calK27 rounded-3xl border border-border bg-surface px-4 py-3 md:flex-1 md:self-start md:px-5 md:py-4 shadow-[0_14px_34px_rgba(36,26,92,0.1)]">
              <span className="mb-1 block font-display text-[17px] font-extrabold tracking-[-0.02em] md:mb-1.5 md:text-[19px]">{c.upcoming}</span>
              {c.upcomingRows.map((row, i) => (
                <div key={row.day} className={`k ${upAnim[i]} ${i === 2 ? 'max-md:hidden' : ''} flex items-center gap-2.5 border-t border-[#EEEBF8] py-1.5 md:py-2`}>
                  <span className="flex h-9 w-9 md:h-11 md:w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-canvas leading-none">
                    <b className="font-display text-[17px]">{row.day}</b>
                    <span className="text-[9.5px] font-extrabold text-muted uppercase">{row.month}</span>
                  </span>
                  <span className="text-[13.5px] leading-tight font-bold">{row.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex h-[68px] shrink-0 flex-col justify-center gap-1.5 border-t border-border bg-surface px-4 md:h-14 md:px-6">
          <span className="relative block h-9 md:h-[22px]">
            {c.legends.map((text, i) => <span key={text} className={`k ${legendAnim[i]} absolute inset-x-0 top-0 text-center text-[13px] leading-[18px] font-bold text-muted md:text-[14.5px] md:leading-normal`}>{text}</span>)}
          </span>
          <span className="block h-[3px] overflow-hidden rounded-sm bg-[#EEEBF8]"><span className="k calProg block h-[3px] origin-left bg-primary" /></span>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, fill, knob }: { label: string; fill: string; knob: string }) {
  return (
    <div className="flex items-center justify-between gap-2.5 border-t border-[#EEEBF8] py-2.5">
      <span className="text-[14.5px] font-bold">{label}</span>
      <span className="relative block h-7 w-[50px] rounded-[14px] bg-[#D9D4F0]">
        <span className={`toggleFill k ${fill} absolute inset-0 rounded-[14px] bg-primary`} />
        <i className={`knob k ${knob} absolute top-[3px] left-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.25)]`} />
      </span>
    </div>
  );
}
