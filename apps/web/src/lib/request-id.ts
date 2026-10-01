import { headers } from 'next/headers';

/** Server-only: the incoming x-request-id (e.g. from the edge) or a fresh one. */
export async function getRequestId() {
  return (await headers()).get('x-request-id') ?? crypto.randomUUID();
}
