'use client';

import type { RefObject } from 'react';
import { strings } from '@remoa/strings/landing';

const b = strings.landing.bank;
const p = b.play;
const chipAnim = ['calK4', 'calK5', 'calK9'];
const rowAnim = ['calK20', 'calK21', 'calK22'];

/** 15s CSS loop, same keyframes as the calendar demo. The step list outside this player is the text alternative. */
export function BankPlayer({ playerRef }: { playerRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={playerRef} className="bqDemo relative w-full overflow-hidden rounded-[36px] border border-border bg-canvas shadow-[0_40px_90px_rgba(36,26,92,0.16)]" role="img" aria-label={b.playerLabel}>
      <div aria-hidden className="absolute inset-0 flex flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-4 md:h-16 md:gap-3 md:px-6">
          <i className="h-3 w-3 rounded-full bg-[#FDBA74]" />
          <i className="h-3 w-3 rounded-full bg-[#FCD34D]" />
          <i className="h-3 w-3 rounded-full bg-[#C9BFFF]" />
          <span className="ml-1 min-w-0 truncate text-[13px] font-bold text-muted md:ml-2.5 md:text-sm">{b.windowTitle}</span>
          <span className="ml-auto shrink-0 rounded-full bg-[#F3F2FB] px-2.5 py-0.5 text-[11.5px] font-extrabold text-primary-deep">{b.preview}</span>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="bq-sc bq-sc1 k calK1 absolute inset-0 flex flex-col gap-4 p-4 md:p-8">
            <div className="flex flex-wrap gap-2">
              {p.subjects.map((subject, i) => (
                <span key={subject} className={`k ${chipAnim[i]} rounded-full border-[1.5px] border-[#D9D4F0] bg-[#F3F2FB] px-3.5 py-1.5 text-[13px] font-extrabold text-primary-deep`}>{subject}</span>
              ))}
            </div>
            <div className="k calK7 flex flex-col gap-3 rounded-3xl border border-border bg-surface p-5 shadow-[0_14px_34px_rgba(36,26,92,0.1)]">
              <span className="font-display text-lg font-extrabold tracking-[-0.02em] md:text-xl">{p.compose}</span>
              <span className="text-[15px] leading-normal text-muted">{p.composeText}</span>
            </div>
          </div>
          <div className="bq-sc bq-sc2 k calK2 absolute inset-0 flex flex-col gap-3 p-4 md:p-6">
            <div className="k calK11 flex flex-col gap-2.5 rounded-3xl border border-border bg-surface p-4 shadow-[0_14px_34px_rgba(36,26,92,0.1)]">
              <span className="text-[14px] leading-snug font-bold md:text-[15px]">{p.stem}</span>
              {p.options.map((option, i) => (
                <div key={option.letter} className={`flex items-center gap-2.5 rounded-[14px] border-[1.5px] px-3 py-1.5 md:py-2 ${i === 1 ? 'border-primary bg-[#F3F2FB]' : 'border-border bg-surface'}`}>
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#EEEBF8] text-[12.5px] font-extrabold text-primary-deep">{option.letter}</span>
                  <span className="text-[12.5px] leading-snug font-semibold md:text-[13.5px]">{option.text}</span>
                </div>
              ))}
            </div>
            <span className="k calK16 self-start rounded-full bg-primary px-3.5 py-1.5 text-[13px] font-extrabold text-white">{p.correct}</span>
          </div>
          <div className="bq-sc bq-sc3 k calK3 absolute inset-0 flex flex-col gap-3 p-4 md:p-8">
            <div className="k calK26 flex items-center justify-between gap-3">
              <span className="font-display text-xl font-extrabold tracking-[-0.02em]">{p.notebook}</span>
              <span className="rounded-full bg-[#F3F2FB] px-3 py-1 text-[13px] font-extrabold text-primary-deep">{p.score}</span>
            </div>
            {p.rows.map((row, i) => (
              <div key={row.subject} className={`k ${rowAnim[i]} flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface px-4 py-3.5`}>
                <span className="font-bold">{row.subject}</span>
                <span className="text-sm font-extrabold text-[#9A3412]">{row.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
