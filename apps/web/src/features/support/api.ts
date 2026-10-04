import type {
  Result, SupportReplyInput, SupportTicketCreated, SupportTicketDetail, SupportTicketInput, SupportTicketSummary, SupportUnread, UploadSignOutput,
} from '@remoa/contracts';
import { api } from '@/lib/api';

// Thin wrappers over /v1/support/*; same shapes as the Api.* function types in @remoa/contracts (the user id is the token).
const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const listMyTickets = () => api<SupportTicketSummary[]>('/v1/support/tickets');
export const getMyTicket = (id: string) => api<SupportTicketDetail>(`/v1/support/tickets/${id}`);
export const getSupportUnread = () => api<SupportUnread>('/v1/support/unread');
export const markTicketRead = (id: string) => api<null>(`/v1/support/tickets/${id}/read`, { method: 'POST' });
export const submitSupportTicket = (input: SupportTicketInput) => api<SupportTicketCreated>('/v1/support/tickets', post(input));
export const replyToTicket = (id: string, input: SupportReplyInput) => api<SupportTicketDetail>(`/v1/support/tickets/${id}/messages`, post(input));
const signAttachment = (mime: string, sizeBytes: number) => api<UploadSignOutput>('/v1/support/attachments/sign', post({ mime, sizeBytes }));

/** FR-5: sign, PUT the bytes, return the key to send with the ticket. Network failures throw (caller shows the retry). */
export async function uploadAttachment(file: File): Promise<Result<string>> {
  const signed = await signAttachment(file.type, file.size);
  if (!signed.ok) return signed;
  const put = await fetch(signed.data.url, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
  if (!put.ok) return { ok: false, error: { code: 'internal', message: `HTTP ${put.status}` } };
  return { ok: true, data: signed.data.key };
}
