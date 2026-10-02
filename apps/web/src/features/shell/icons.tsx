import type { ReactNode } from 'react';

const Svg = ({ children }: { children: ReactNode }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const MapIcon = () => <Svg><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /><path d="M6.5 10v4.5H14" /></Svg>;
export const ReviewIcon = () => <Svg><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></Svg>;
export const CoverageIcon = () => <Svg><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>;
export const StoreIcon = () => <Svg><path d="M4 7h16l-1 13H5L4 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></Svg>;
export const AccountIcon = () => <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></Svg>;
export const SunIcon = () => <Svg><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></Svg>;
export const MoonIcon = () => <Svg><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" /></Svg>;
export const UploadIcon = () => <Svg><path d="M12 15V3M7 8l5-5 5 5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></Svg>;
export const ArrowIcon = () => <Svg><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
