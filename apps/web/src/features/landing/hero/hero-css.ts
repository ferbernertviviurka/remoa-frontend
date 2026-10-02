/**
 * F16 FR-4/FR-17 (D-232): the hero timeline in CSS, inlined in the SSR HTML through React 19 `<style href precedence>`
 * so the final frame and the overlays' hidden state never wait for a CSS chunk (LCP-safe, no flash).
 * Static styles ARE the final frame; the sequence only runs under .hx-stage[data-play], and every keyframe fills
 * backwards so it starts from frame 0. --k scales the whole timeline (1 on desktop, ~4 s on mobile). Only transform,
 * opacity, clip-path, stroke-dashoffset and the state border tokens (discrete flip) are animated.
 */
export const HERO_CSS = `
@keyframes hx-rise { from { opacity: 0; transform: translateY(56px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes hx-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
@keyframes hx-fadein { from { opacity: 0; } to { opacity: 1; } }
@keyframes hx-fadeout { from { opacity: 1; } to { opacity: 0; } }
@keyframes hx-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes hx-pop { from { opacity: 0; transform: scale(.88); } to { opacity: 1; transform: none; } }
@keyframes hx-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes hx-dim { from { opacity: 1; } }
@keyframes hx-inright { from { opacity: 0; transform: translateX(56px); } to { opacity: 1; transform: none; } }
@keyframes hx-inup { from { opacity: 0; transform: translateY(56px); } to { opacity: 1; transform: none; } }
@keyframes hx-type { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes hx-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes hx-heat {
  from {
    --state-review-border: var(--cv-node-border);
    --state-watch-border: var(--cv-node-border);
    --state-steady-border: var(--cv-node-border);
    --state-unknown-border: var(--cv-node-border);
  }
}

.hx-in { animation: hx-up .9s cubic-bezier(.22, 1, .36, 1) var(--d, 0s) both; }
.hx-bar { transform-origin: 0 50%; animation: hx-bar 1s cubic-bezier(.22, 1, .36, 1) .9s both; }

.hx-stage { --k: 1; }
@media (max-width: 767px) { .hx-stage { --k: .66; } }

.hx-stage[data-play] .hx-window { animation: hx-rise calc(1s * var(--k)) cubic-bezier(.22, 1, .36, 1) calc(.5s * var(--k)) both; }
.hx-stage[data-play] .hx-pop { animation: hx-pop calc(.55s * var(--k)) cubic-bezier(.22, 1, .36, 1) calc(var(--d) * var(--k)) both; }
.hx-stage[data-play] .hx-draw { animation: hx-draw calc(.8s * var(--k)) ease-out calc(var(--d) * var(--k)) both; }
.hx-stage[data-play] .hx-fade { animation: hx-fadein calc(.4s * var(--k)) ease calc(var(--d) * var(--k)) both; }
.hx-stage[data-play] .hx-out { animation: hx-fadeout calc(.4s * var(--k)) ease calc(var(--d) * var(--k)) both; }
.hx-stage[data-play] .hx-node {
  animation:
    hx-heat calc(.6s * var(--k)) linear calc(var(--h) * var(--k)) both,
    hx-dim calc(.5s * var(--k)) ease calc(3.4s * var(--k)) both;
}
.hx-stage[data-play] .hx-panel { animation: hx-inright calc(.7s * var(--k)) cubic-bezier(.22, 1, .36, 1) calc(3.4s * var(--k)) both; }
.hx-stage[data-play] .hx-typed { animation: hx-type calc(1.4s * var(--k)) steps(22) calc(4.2s * var(--k)) both; }
.hx-stage[data-play] .hx-verdict { animation: hx-pop calc(.5s * var(--k)) cubic-bezier(.22, 1, .36, 1) calc(5.4s * var(--k)) both; }
.hx-stage[data-play] .hx-chip {
  animation:
    hx-fadein calc(.5s * var(--k)) ease calc(var(--d) * var(--k)) both,
    hx-float var(--f) ease-in-out calc((var(--d) + .5s) * var(--k)) 1;
}
.hx-edge { stroke-dasharray: 1; }
.hx-out { opacity: 0; }

@media (max-width: 1023px) {
  .hx-stage[data-play] .hx-panel { animation-name: hx-inup; }
}

@media (prefers-reduced-motion: reduce) {
  :root:not([data-motion="full"]) .hx-in,
  :root:not([data-motion="full"]) .hx-bar,
  :root:not([data-motion="full"]) .hx-stage * { animation: none !important; }
}
:root[data-motion="reduced"] .hx-in,
:root[data-motion="reduced"] .hx-bar,
:root[data-motion="reduced"] .hx-stage * { animation: none !important; }
`;
