'use client';

import dynamic from 'next/dynamic';

/** G21 FR-48: o tutorial só baixa quando abre (primeira visita ou "Como funciona"). Sem esqueleto: é um diálogo. */
export const LazyCalendarTour = dynamic(() => import('./calendar-tour-island'), { ssr: false });
