import { redirect } from 'next/navigation';

// G01 T6: the challenge is a mode of the editor.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/app/mapas/${encodeURIComponent(id)}?modo=desafio`);
}
