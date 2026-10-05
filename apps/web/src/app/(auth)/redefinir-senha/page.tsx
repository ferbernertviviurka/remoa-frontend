import { ResetForm } from '@/features/auth/reset-form';
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const { data } = await (await createClient()).auth.getUser();
  return <ResetForm hasSession={!!data.user} />;
}
