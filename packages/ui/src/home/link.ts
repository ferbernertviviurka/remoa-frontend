import type { ComponentType, ReactNode } from 'react';

/** Elemento de link aceito pelos cartões do carrossel (`as`): 'a' ou o PendingLink/next/link do app. */
export type SlideLink = ComponentType<{ href: string; 'aria-label'?: string; className?: string; children?: ReactNode }> | 'a';
