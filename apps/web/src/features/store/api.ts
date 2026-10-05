// Embrulho da lista de espera da loja (G16/F22 Fase A): GET /v1/store/config · GET|PUT|DELETE /v1/store/waitlist.
import type { Result, StoreConfig, StoreWaitlistEntry, StoreWaitlistInput } from '@remoa/contracts';
import { api } from '@/lib/api';

export type { StoreConfig, StoreSellerRole, StoreWaitlistEntry, StoreWaitlistInput } from '@remoa/contracts';
export type StoreInterest = StoreWaitlistEntry['interest'][number];

export const storeApi = {
  config: (): Promise<Result<StoreConfig>> => api<StoreConfig>('/v1/store/config'),
  /** `data` é null quando a pessoa não está na lista. */
  getWaitlist: (): Promise<Result<StoreWaitlistEntry | null>> => api<StoreWaitlistEntry | null>('/v1/store/waitlist'),
  putWaitlist: (input: StoreWaitlistInput): Promise<Result<StoreWaitlistEntry>> => api<StoreWaitlistEntry>('/v1/store/waitlist', { method: 'PUT', body: JSON.stringify(input) }),
  leaveWaitlist: (): Promise<Result<null>> => api<null>('/v1/store/waitlist', { method: 'DELETE' }),
};
