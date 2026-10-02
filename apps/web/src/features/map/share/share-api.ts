// F17 T7: share API calls (owner only). Uses the browser client (`api`) — never called from Server Components.
import type { Result } from '@remoa/contracts';
import type { ShareState, UpdateShareInput } from '@remoa/contracts';
import { api } from '@/lib/api';

export async function getShare(boardId: string): Promise<Result<ShareState>> {
  return api<ShareState>(`/v1/boards/${boardId}/share`);
}

export async function updateShare(boardId: string, input: UpdateShareInput): Promise<Result<ShareState>> {
  return api<ShareState>(`/v1/boards/${boardId}/share`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
