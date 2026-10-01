'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '@remoa/strings';
import { IconButton } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { MoonIcon, SunIcon } from './icons';
import { THEME_KEY } from './theme';

type Theme = 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const set = document.documentElement.dataset.theme;
    setTheme(set === 'light' || set === 'dark' ? set : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage blocked: theme still applies for this visit */
    }
    setTheme(next);
    track('theme_toggled', { theme: next });
  }, [theme]);

  return (
    <IconButton aria-label={t('shell.header.themeToggle')} title={theme === 'dark' ? t('shell.header.themeLight') : t('shell.header.themeDark')} onClick={toggle}>
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  );
}
