import { AuthForm } from '@/features/auth/auth-form';

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="signUp" next={next} />;
}
