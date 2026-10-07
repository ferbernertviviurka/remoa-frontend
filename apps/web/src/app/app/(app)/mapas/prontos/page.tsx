import { redirect } from 'next/navigation';

/** F31: the library lives in /app/mapas (aba Biblioteca); this old address just points there. */
export default function Page() {
  redirect('/app/mapas?aba=biblioteca');
}
