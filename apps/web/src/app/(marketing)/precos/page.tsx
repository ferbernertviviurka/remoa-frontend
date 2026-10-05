import { permanentRedirect } from 'next/navigation';

/** G10: /precos segue público (visitante); os planos vivem na landing. A tela logada é /app/planos. */
export default function Page() {
  permanentRedirect('/#planos');
}
