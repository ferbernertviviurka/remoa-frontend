import { notFound } from 'next/navigation';
import { EmailsPreview } from '@/features/dev-emails/preview';

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <EmailsPreview />;
}
