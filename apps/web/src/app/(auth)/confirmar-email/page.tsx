import { ConfirmEmail } from '@/features/auth/confirm-email';

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <ConfirmEmail failed={!!error} />;
}
