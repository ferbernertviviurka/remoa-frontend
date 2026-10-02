import { redirect } from 'next/navigation';

// G01 T6: the daily session now runs inside the map (started from Revisar).
export default function Page() {
  redirect('/revisar');
}
