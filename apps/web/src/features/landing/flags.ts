/** F16 (D-233): landing flags come from env until there is a flags panel. Read on the server (page/layout) and passed down as props. */
export type LaunchPhase = 'waitlist' | 'open';
export const landingFlags = () => ({
  launchPhase: (process.env.NEXT_PUBLIC_LAUNCH_PHASE === 'open' ? 'open' : 'waitlist') as LaunchPhase,
  betaFounder: process.env.NEXT_PUBLIC_BETA_FOUNDER === '1',
  /** FR-21: "Revisado por médico" chips/badges only when approved content exists (F10). */
  approvedContent: process.env.NEXT_PUBLIC_APPROVED_CONTENT === '1',
});
export type LandingFlags = ReturnType<typeof landingFlags>;
