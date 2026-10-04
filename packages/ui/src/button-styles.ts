/** Button class strings without 'use client' (D-535): importing them from button.tsx kept Button + Torph in every bundle that only needed a focus ring. */

export const buttonVariants = {
  primary: 'font-bold bg-primary text-on-primary hover:brightness-110 disabled:bg-border-strong disabled:text-muted disabled:opacity-100 disabled:cursor-not-allowed',
  secondary: 'font-bold bg-surface text-ink border border-border-strong hover:border-primary hover:bg-primary-tint',
  quiet: 'font-bold bg-transparent text-primary-deep hover:bg-primary-tint',
  danger: 'font-bold bg-review text-white hover:brightness-110 disabled:bg-[#EAD3C7] disabled:text-[#7C2D12] disabled:opacity-100 disabled:cursor-not-allowed',
  light: 'bg-on-dark text-panel-dark font-extrabold hover:brightness-95',
  'outline-light': 'font-bold px-5! border-[1.5px] border-white/40 text-on-dark hover:bg-white/10',
} as const;

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export const pressable =
  'remoa-press cursor-pointer transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98]';

export const fieldControl =
  'w-full rounded-field border-[1.5px] border-border-strong bg-surface px-4 text-base font-semibold text-ink transition-[border-color,box-shadow] duration-150 placeholder:font-normal placeholder:text-muted hover:border-primary focus-visible:border-primary';
