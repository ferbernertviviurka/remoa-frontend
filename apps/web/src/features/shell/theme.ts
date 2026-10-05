export const THEME_KEY = 'remoa-theme';

/**
 * Inline, runs before paint: applies the stored theme (if any); otherwise CSS follows prefers-color-scheme.
 * D-534: also applies the `remoa-motion` cookie (F13 FR-14) here instead of `cookies()` in the root layout, which made every route dynamic.
 */
export const themeScript = `try{var d=document.documentElement,t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')d.dataset.theme=t;var m=/(?:^|; )remoa-motion=(reduced|full)/.exec(document.cookie);if(m)d.dataset.motion=m[1]}catch(e){}`;
