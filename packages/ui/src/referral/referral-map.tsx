import { SkeletonBlock, SkeletonRegion } from '../skeleton';
import { Icon } from '../icons';
import { statusStyle, type ReferralStatus } from './status';

export interface MapFriend {
  id: string;
  /** Primeiro nome e inicial, ou e-mail mascarado */
  name: string;
  status: ReferralStatus;
}

export interface ReferralMapProps {
  /** Até 8 entram no mapa; o resto só na lista */
  friends: ReadonlyArray<MapFriend>;
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** "Você" */
  youLabel: string;
  /** Selo dos amigos com primeiro mapa ("+1 mês") */
  badgeLabel: string;
  /** Rótulo dos nós do estado vazio ("Convidar") e destino (âncora do cartão do link) */
  inviteLabel: string;
  inviteHref?: string;
  onInvite?: () => void;
  /** Carregando (esqueleto); texto só para leitor de tela */
  loadingLabel?: string;
}

const W = 800;
const H = 460;
const CX = 400;
const CY = 230;
const RX = 280;
const RY = 150;
export const MAP_MAX_FRIENDS = 8;
const GHOSTS: ReadonlyArray<readonly [number, number]> = [[150, 130], [650, 130], [400, 392]];

/**
 * ReferralMap (F18 FR-10): o usuário ao centro e até 8 amigos em elipse, ligados por arestas conforme o estado.
 * Movimento: nós em cascata (0,3 s + 0,12 s por nó), arestas se desenham (800 ms; tracejadas aparecem em 600 ms), seleção amplia 14% (350 ms).
 * `aria-hidden`: a lista (`FriendList`) é a representação principal para leitor de tela; os nós do mapa saem da ordem de tabulação.
 * Sem amigos: 3 nós "Convidar" (links acessíveis, fora do `aria-hidden`). Legenda: `ReferralLegend`.
 */
export function ReferralMap({ friends, selectedId, onSelect, youLabel, badgeLabel, inviteLabel, inviteHref = '#compartilhar', onInvite, loadingLabel }: ReferralMapProps) {
  const frame = 'relative h-[460px] overflow-hidden rounded-[30px] bg-canvas [background-image:radial-gradient(var(--grid-dot)_1px,transparent_1px)] [background-size:24px_24px]';
  if (loadingLabel) {
    return (
      <div className={frame}>
        <SkeletonRegion label={loadingLabel}><div className="flex h-[460px] items-center justify-center"><SkeletonBlock width={88} height={88} radius="50%" /></div></SkeletonRegion>
      </div>
    );
  }
  const vis = friends.slice(0, MAP_MAX_FRIENDS);
  const n = vis.length;
  const start = n === 1 ? -20 : -90;
  const placed = vis.map((f, i) => {
    const ang = ((start + i * (360 / n)) * Math.PI) / 180;
    return { f, x: CX + RX * Math.cos(ang), y: CY + RY * Math.sin(ang), i };
  });
  return (
    <div className={frame}>
      <div className="absolute left-1/2 top-0" style={{ width: W, height: H, marginLeft: -W / 2 }}>
        <div aria-hidden="true" data-testid="referral-map">
          {placed.map(({ f, x, y, i }) => {
            const st = statusStyle[f.status];
            const len = Math.hypot(x - CX, y - CY);
            const delay = 0.2 + i * 0.12;
            return (
              <svg key={`e-${f.id}`} width="1" height="1" className="pointer-events-none absolute left-0 top-0 overflow-visible" data-edge={f.status}>
                <path d={`M${CX} ${CY} L${x.toFixed(1)} ${y.toFixed(1)}`} pathLength={st.dashed ? len.toFixed(1) : 1} fill="none" stroke={st.edge} strokeWidth={st.edgeWidth} strokeLinecap="round" strokeDasharray={st.dashed ? '6 8' : 1}
                  className={st.dashed ? undefined : 'rf-edge'} style={{ animation: st.dashed ? `rf-fadein 0.6s ease ${delay}s both` : undefined, animationDelay: st.dashed ? undefined : `${delay}s` }} />
              </svg>
            );
          })}
          <span className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: CX, top: CY }}>
            <span className="rf-popn flex size-[88px] items-center justify-center rounded-full bg-primary font-display text-2xl font-extrabold text-on-primary shadow-[0_0_0_8px_var(--primary-tint),0_16px_36px_rgba(36,26,92,0.2)]">{youLabel}</span>
          </span>
          {placed.map(({ f, x, y, i }) => {
            const st = statusStyle[f.status];
            const on = f.id === selectedId;
            return (
              <button key={f.id} type="button" tabIndex={-1} aria-pressed={on} onClick={() => onSelect?.(f.id)}
                className="absolute flex flex-col items-center gap-1.5 border-0 bg-transparent p-0 transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ left: x, top: y, transform: `translate(-50%,-50%) scale(${on ? 1.14 : 1})` }}>
                <span className={`rf-popn relative flex size-16 items-center justify-center rounded-full border-[3px] font-display text-[22px] font-extrabold transition-[background-color,border-color] duration-[400ms] ${st.node}`}
                  style={{ animationDelay: `${0.3 + i * 0.12}s`, boxShadow: on ? '0 0 0 6px var(--primary-tint), 0 14px 30px rgba(36,26,92,0.18)' : '0 8px 20px rgba(36,26,92,0.08)' }}>
                  {f.name.charAt(0).toUpperCase()}
                  {f.status === 'qualified' ? <span className="pop absolute -right-3.5 -top-3 whitespace-nowrap rounded-pill bg-primary px-2 py-0.5 text-[11px] font-extrabold text-on-primary">{badgeLabel}</span> : null}
                </span>
                <span className="whitespace-nowrap rounded-pill border border-border bg-surface px-2.5 py-0.5 text-xs font-bold text-ink">{f.name}</span>
              </button>
            );
          })}
        </div>
        {n === 0
          ? GHOSTS.map(([x, y], i) => (
              <a key={i} href={inviteHref} aria-label={inviteLabel} onClick={onInvite} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 no-underline" style={{ left: x, top: y }}>
                <span className="rf-popn flex size-16 items-center justify-center rounded-full border-[3px] border-dashed border-unknown-soft bg-surface text-muted" style={{ animationDelay: `${0.3 + i * 0.15}s` }}><Icon name="plus" size={26} /></span>
                <span className="text-xs font-bold text-muted">{inviteLabel}</span>
              </a>
            ))
          : null}
      </div>
    </div>
  );
}

/** Legenda do mapa (FR-10): uma pílula por estado com a contagem; o texto ("2 com o 1º mapa") vem pronto por prop. */
export function ReferralLegend({ items }: { items: ReadonlyArray<{ status: ReferralStatus; label: string }> }) {
  const tone: Record<ReferralStatus, string> = { qualified: 'bg-primary-tint text-primary-deep', signed_up: 'bg-watch-bg text-watch-text', invited: 'bg-unknown-bg text-muted' };
  const dot: Record<ReferralStatus, string> = { qualified: 'bg-primary', signed_up: 'bg-watch', invited: 'bg-unknown' };
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-[13px] font-bold">
      {items.map((it) => (
        <li key={it.status} className={`flex h-9 items-center gap-2 rounded-pill px-3.5 ${tone[it.status]}`}>
          <span aria-hidden="true" className={`size-[9px] rounded-full ${dot[it.status]}`} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
