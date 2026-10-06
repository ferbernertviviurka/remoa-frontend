/** F16 (D-233): landing flags come from env until there is a flags panel. Read on the server (page/layout) and passed down as props. */
export type LaunchPhase = 'waitlist' | 'open';
export const landingFlags = () => ({
  // Opt-in waitlist: removing the env (Vercel) must reopen sign-up, not keep the CTAs on the waitlist.
  launchPhase: (process.env.NEXT_PUBLIC_LAUNCH_PHASE === 'waitlist' ? 'waitlist' : 'open') as LaunchPhase,
  betaFounder: process.env.NEXT_PUBLIC_BETA_FOUNDER === '1',
  /** FR-21: "Revisado por médico" chips/badges only when approved content exists (F10). */
  approvedContent: process.env.NEXT_PUBLIC_APPROVED_CONTENT === '1',
});
export type LandingFlags = ReturnType<typeof landingFlags>;
