'use client';

import type { RefObject } from 'react';
import { strings } from '@remoa/strings/landing';

const ia = strings.landing.ia;
const p = ia.play;
const borders = ['border-[#6D5BD0]', 'border-[#CA8A04]', 'border-[#C2410C]'];
const cardAnim = ['iaK10', 'iaK11', 'iaK12'];
const chipAnim = ['iaK13', 'iaK14', 'iaK15', 'iaK16'];
const optAnim = ['iaK17', 'iaK18', 'iaK19', 'iaK20'];
const pointAnim = ['iaK30', 'iaK31', 'iaK32', 'iaK33'];
const legendAnim = ['iaK36', 'iaK37', 'iaK38', 'iaK39'];

/** 20s CSS loop. The step list outside this player is the text alternative. */
export function IaPlayer({ playerRef }: { playerRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={playerRef} className="iaDemo relative w-full overflow-hidden rounded-[36px] border border-border bg-canvas shadow-[0_40px_90px_rgba(36,26,92,0.16)]" role="img" aria-label={ia.playerLabel}>
      <div aria-hidden className="absolute inset-0 flex flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-4 md:h-16 md:gap-3 md:px-6">
          <i className="h-3 w-3 rounded-full bg-[#FDBA74]" />
          <i className="h-3 w-3 rounded-full bg-[#FCD34D]" />
          <i className="h-3 w-3 rounded-full bg-[#C9BFFF]" />
          <span className="ml-1 min-w-0 truncate text-[13px] font-bold text-muted md:ml-2.5 md:text-sm">{ia.windowTitle}</span>
          <span className="ml-auto shrink-0 rounded-full bg-[#F3F2FB] px-2.5 py-0.5 text-[11.5px] font-extrabold text-primary-deep">{ia.preview}</span>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="ia-sc ia-sc1 k iaK1 absolute inset-0 flex flex-col gap-3 p-4 md:flex-row md:gap-6 md:p-6">
            <div className="flex shrink-0 flex-col gap-3 md:w-[42%] md:gap-4">
              <div className="k iaK5 rounded-[22px] border border-border bg-surface p-4 shadow-[0_14px_34px_rgba(36,26,92,0.1)]">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-lg bg-[#C2410C] px-2.5 py-0.5 text-xs font-extrabold text-white">{p.pdf}</span>
                  <span className="text-[15px] font-extrabold">{p.file}</span>
                </div>
                <div className="mt-3.5 hidden flex-col gap-2 md:flex">
                  {['w-[92%]', 'w-[80%]', 'w-[88%]', 'w-[60%]', 'w-[84%]'].map((w) => <span key={w} className={`block h-[9px] rounded-[5px] bg-[#E9E6F6] ${w}`} />)}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="k iaK6 relative block h-2.5 overflow-hidden rounded-[5px] bg-[#EEEBF8]">
                  <span className="k iaK7 absolute inset-0 origin-left rounded-[5px] bg-primary" />
                </span>
                <span className="relative block h-[22px]">
                  <span className="k iaK8 absolute top-0 left-0 text-[13.5px] font-bold text-muted">{p.reading}</span>
                  <span className="k iaK9 absolute top-0 left-0 text-[13.5px] font-extrabold text-primary-deep">{p.created}</span>
                </span>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 md:gap-3">
              {p.cards.map((c, i) => (
                <div key={c.title} className={`k ${cardAnim[i]} ${i === 2 ? 'max-md:hidden' : ''} flex flex-col gap-1 rounded-[20px] border-[1.5px] bg-surface px-4 py-3 md:py-3.5 shadow-[0_10px_24px_rgba(36,26,92,0.08)] ${borders[i]}`}>
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="font-display text-[15px] font-extrabold md:text-[17px]">{c.title}</span>
                    <span className="shrink-0 rounded-full bg-[#F3F2FB] px-2 py-0.5 text-[11.5px] font-extrabold text-primary-deep">{c.source}</span>
                  </div>
                  <span className="text-[13.5px] leading-snug text-muted">{c.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ia-sc ia-sc2 k iaK2 absolute inset-0 flex flex-col gap-3 p-4 md:gap-3.5 md:p-6">
            <div className="flex flex-wrap gap-2">
              {p.chips.map((c, i) => <span key={c} className={`k ${chipAnim[i]} ${i > 1 ? 'max-md:hidden' : ''} rounded-full border-[1.5px] border-[#D9D4F0] bg-[#F3F2FB] px-3 py-1 text-[12.5px] md:px-3.5 md:py-1.5 md:text-[13px] font-extrabold text-primary-deep`}>{c}</span>)}
            </div>
            <div className="k iaK21 flex flex-col gap-2 rounded-3xl border border-border bg-surface p-4 shadow-[0_14px_34px_rgba(36,26,92,0.1)]">
              <span className="text-[14px] leading-snug font-bold md:text-[15px]">{p.question}</span>
              {p.options.map((o, i) => (
                <div key={o.letter} className={`k ${optAnim[i]} flex items-center gap-2.5 rounded-[14px] border-[1.5px] px-3 py-1.5 md:py-2 ${i === 1 ? 'border-primary bg-[#F3F2FB]' : 'border-border bg-surface'}`}>
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#EEEBF8] text-[12.5px] font-extrabold text-primary-deep">{o.letter}</span>
                  <span className="text-[12.5px] leading-snug font-semibold md:text-[13.5px]">{o.text}</span>
                </div>
              ))}
            </div>
            <div className="k iaK22 hidden flex-wrap items-center gap-2 md:flex">
              <span className="text-[12.5px] font-extrabold text-muted">{p.saved}</span>
              {p.tags.map((tag, i) => <span key={tag} className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${i === 2 ? 'bg-[#FEF3C7] text-[#854D0E]' : 'bg-[#E4DFF8] text-primary-deep'}`}>{tag}</span>)}
            </div>
          </div>
          <div className="ia-sc ia-sc3 k iaK3 absolute inset-0 flex flex-col gap-3 px-4 py-4 md:px-8 md:py-5">
            <span className="k iaK23 text-[15.5px] leading-snug font-extrabold">{p.gradeQ}</span>
            <div className="k iaK24 rounded-[18px] border-2 border-primary bg-canvas px-4 py-3.5">
              <span className="k iaK25 block text-[14.5px] leading-snug">{p.answer}</span>
            </div>
            <div className="relative h-[50px]">
              <span className="k iaK26 absolute top-0 left-0 flex h-[46px] items-center rounded-[23px] bg-primary px-6 text-[14.5px] font-extrabold text-white">
                <span className="k iaK27 block">{p.grade}</span>
              </span>
              <span className="k iaK28 absolute top-3.5 left-[150px] flex gap-1.5">
                <i className="iaDots h-2.5 w-2.5 rounded-full bg-primary" />
                <i className="iaDots d1 h-2.5 w-2.5 rounded-full bg-primary" />
                <i className="iaDots d2 h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
            </div>
            <div className="k iaK29 flex flex-col gap-2 rounded-[20px] border border-border bg-surface px-4 py-3.5 shadow-[0_12px_28px_rgba(36,26,92,0.1)]">
              <div className="flex items-center gap-2.5">
                <span className="rounded-full bg-[#FEF3C7] px-3.5 py-1 text-sm font-extrabold text-[#854D0E]">{p.verdict}</span>
                <span className="text-[12.5px] font-bold text-muted">{p.verdictNote}</span>
              </div>
              <span className="text-[13.5px] leading-snug"><b className="text-[#0F766E]">{p.hit}</b> {p.hitText}</span>
              <span className="text-[13.5px] leading-snug"><b className="text-[#C2410C]">{p.miss}</b> {p.missText}</span>
            </div>
          </div>
          <div className="ia-sc ia-sc4 k iaK4 absolute inset-0 p-3 md:p-5">
            <div className="flex h-full flex-col gap-2.5 rounded-3xl border border-border bg-surface px-4 py-3.5 shadow-[0_14px_34px_rgba(36,26,92,0.1)]">
              <div className="k iaK34 flex items-center justify-between gap-2.5">
                <span className="font-display text-[17px] font-extrabold tracking-[-0.02em] md:text-[19px]">{p.summaryTitle}</span>
                <span className="shrink-0 rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11.5px] font-extrabold text-[#854D0E]">{p.generated}</span>
              </div>
              {p.points.map((pt, i) => (
                <div key={pt.mark} className={`k ${pointAnim[i]} flex items-start gap-2.5`}>
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-[13.5px] leading-snug text-[#2B2750]">{pt.text} <span className="rounded-[7px] bg-[#F3F2FB] px-1.5 py-px text-[11px] font-extrabold text-primary-deep">{pt.mark}</span></span>
                </div>
              ))}
              <div className="k iaK35 mt-auto flex flex-wrap items-center gap-2.5">
                <span className="rounded-xl bg-[#F3F2FB] px-3.5 py-1.5 text-[12.5px] font-extrabold text-primary-deep">{p.copy}</span>
                <span className="rounded-xl bg-[#F3F2FB] px-3.5 py-1.5 text-[12.5px] font-extrabold text-primary-deep">{p.print}</span>
                <span className="text-xs text-muted">{p.cite}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex h-[68px] shrink-0 flex-col justify-center gap-1.5 border-t border-border bg-surface px-4 md:h-14 md:px-6">
          <span className="relative block h-9 md:h-[22px]">
            {ia.legends.map((text, i) => <span key={text} className={`k ${legendAnim[i]} absolute inset-x-0 top-0 text-center text-[13px] leading-[18px] font-bold text-muted md:text-[14.5px] md:leading-normal`}>{text}</span>)}
          </span>
          <span className="block h-[3px] overflow-hidden rounded-sm bg-[#EEEBF8]"><span className="k iaProg block h-[3px] origin-left bg-primary" /></span>
        </div>
      </div>
    </div>
  );
}
