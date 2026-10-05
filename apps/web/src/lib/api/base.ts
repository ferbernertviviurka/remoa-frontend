/** Own module so public pages (the landing) can reach the API without pulling `@remoa/contracts` + zod into their bundle (D-535). */
export const apiBase = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
