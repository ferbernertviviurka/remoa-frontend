export const THEME_KEY = 'remoa-theme';

/** Inline, runs before paint: applies the stored theme (if any); otherwise CSS follows prefers-color-scheme. */
export const themeScript = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
