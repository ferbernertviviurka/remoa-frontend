import { Icon } from '../icons';
import { focusRing } from '../button-styles';

export interface ReferralHeroProps {
  eyebrow: string;
  /** Texto antes do trecho destacado ("Você e seu amigo ganham ") */
  titleBefore: string;
  /** Trecho com a barra desenhada sob ele ("1 mês de Pro.") */
  titleHighlight: string;
  subtitle: string;
  primary: { label: string; href: string; onClick?: () => void };
  secondary: { label: string; href: string; onClick?: () => void };
  /** Textos da ilustração (decorativa) */
  art: { you: string; friend: string; reward: string; badge: string };
}

const anim = (name: string, dur: string, delay: string, ease = 'cubic-bezier(0.22,1,0.36,1)') => `${name} ${dur} ${ease} ${delay} both`;

/**
 * ReferralHero (F18 FR-3): herói escuro com título (barra sob "1 mês de Pro." desenha em 800 ms), CTAs e ilustração de dois nós que se ligam.
 * Linha do tempo: nós 0,3 s e 0,5 s (600 ms), linha 0,7 s (1.000 ms), rótulo 1,5 s e selos 2,0 s e 2,2 s (500 ms), depois flutuam 5–6 s.
 * Movimento reduzido (sistema ou `data-motion="reduced"`): quadro final. A ilustração some abaixo de 1024 px.
 */
export function ReferralHero({ eyebrow, titleBefore, titleHighlight, subtitle, primary, secondary, art }: ReferralHeroProps) {
  const cta = ['lift flex h-14 items-center gap-2.5 rounded-[16px] px-[26px] text-[17px] font-extrabold no-underline', focusRing].join(' ');
  return (
    <section aria-labelledby="referral-hero-title" className="relative flex min-h-[380px] items-center justify-between gap-6 overflow-hidden rounded-[38px] bg-panel-dark px-12 py-11 text-on-dark max-md:px-6 max-md:py-8">
      <div className="flex max-w-[600px] flex-col gap-[18px]">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-on-dark-muted" style={{ animation: 'rf-fadein 0.6s ease both' }}>{eyebrow}</span>
        <h1 id="referral-hero-title" className="m-0 font-display text-[58px] font-extrabold leading-[1.03] tracking-[-0.04em] max-md:text-[38px]" style={{ animation: anim('rf-rise', '0.9s', '0.1s') }}>
          {titleBefore}
          <span className="relative isolate inline-block">
            {titleHighlight}
            <span aria-hidden="true" className="absolute -inset-x-0.5 bottom-[0.06em] -z-10 h-[0.24em] origin-left rounded-md bg-primary" style={{ animation: anim('rf-ulbar', '1s', '0.8s') }} />
          </span>
        </h1>
        <p className="m-0 text-xl leading-normal text-on-dark-muted-2 max-md:text-base" style={{ animation: anim('rf-rise', '0.9s', '0.25s') }}>{subtitle}</p>
        <div className="mt-1.5 flex flex-wrap gap-3" style={{ animation: anim('rf-rise', '0.9s', '0.4s') }}>
          <a href={primary.href} onClick={primary.onClick} className={`${cta} bg-surface text-panel-dark`}><Icon name="share" size={20} />{primary.label}</a>
          <a href={secondary.href} onClick={secondary.onClick} className={`${cta} border-[1.5px] border-on-dark-line bg-transparent text-on-dark`}>{secondary.label}</a>
        </div>
      </div>
      <ReferralHeroArt {...art} />
    </section>
  );
}

/** Ilustração do herói: nó "Você" e nó "Amigo" ligados por uma linha, "1 mês de Pro" no meio e "+1 mês" nos dois. `aria-hidden`. */
export function ReferralHeroArt({ you, friend, reward, badge }: ReferralHeroProps['art']) {
  const dot = (left: number, top: number, size: number, color: string, delay: string, dur: string, fdelay: string) => (
    <span className="absolute rounded-full" style={{ left, top, width: size, height: size, background: color, animation: `rf-fadein 0.6s ease ${delay} both, rf-floaty ${dur} ease-in-out ${fdelay} infinite` }} />
  );
  const pop = (delay: string) => `rf-popn 0.5s cubic-bezier(0.22,1,0.36,1) ${delay} both`;
  return (
    <div aria-hidden="true" data-testid="referral-hero-art" className="relative h-[340px] w-[480px] shrink-0 max-lg:hidden">
      {dot(36, 52, 14, 'var(--state-review-on-dark)', '1.2s', '6s', '1.8s')}
      {dot(420, 40, 10, 'var(--state-steady-on-dark)', '1.4s', '7s', '2s')}
      {dot(330, 300, 12, 'var(--state-watch-on-dark)', '1.6s', '5s', '2.2s')}
      <svg width="1" height="1" className="absolute left-0 top-0 overflow-visible">
        <path d="M168 176H312" pathLength="1" fill="none" stroke="var(--state-steady-on-dark)" strokeWidth="4" strokeLinecap="round" style={{ strokeDasharray: 1, animation: 'rf-edge 1s ease 0.7s both' }} />
      </svg>
      <span className="absolute flex size-24 items-center justify-center rounded-full bg-steady-on-dark font-display text-[30px] font-extrabold text-panel-dark" style={{ left: 104, top: 128, animation: anim('rf-popn', '0.6s', '0.3s') }}>{you}</span>
      <span className="absolute flex size-24 items-center justify-center rounded-full border-4 border-steady-on-dark bg-surface font-display text-[28px] font-extrabold text-panel-dark" style={{ left: 280, top: 128, animation: anim('rf-popn', '0.6s', '0.5s') }}>{friend}</span>
      <span className="absolute whitespace-nowrap rounded-pill bg-surface px-3.5 py-[5px] text-[13px] font-extrabold text-panel-dark" style={{ left: 176, top: 142, animation: pop('1.5s') }}>{reward}</span>
      <span className="absolute rounded-pill bg-review-on-dark px-3 py-1 text-[13px] font-extrabold text-panel-dark" style={{ left: 84, top: 104, animation: `${pop('2s')}, rf-floaty 5s ease-in-out 2.6s infinite` }}>{badge}</span>
      <span className="absolute rounded-pill bg-review-on-dark px-3 py-1 text-[13px] font-extrabold text-panel-dark" style={{ left: 300, top: 104, animation: `${pop('2.2s')}, rf-floaty 6s ease-in-out 2.8s infinite` }}>{badge}</span>
    </div>
  );
}
