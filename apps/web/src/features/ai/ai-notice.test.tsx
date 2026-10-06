import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiNotice, AiSource, AiStreaming, AiWarning, FlagGradeButton } from './ai-notice';
import { violations } from '../cards/test-utils';

const api = vi.fn();
const trackAi = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('@/lib/analytics', () => ({ trackAi: (...a: unknown[]) => trackAi(...a) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const XSS = '<script>window.hacked=1</script><img src=x onerror="window.hacked=1">';

describe('AI states', () => {
  it('always shows the permanent warning', async () => {
    const { container } = render(<AiWarning />);
    expect(screen.getByText('A IA pode errar. Confira a fonte.')).toBeVisible();
    expect(await violations(container)).toEqual([]);
  });

  it('streaming shows the text as it comes, as plain text', () => {
    const { container } = render(<AiStreaming text={XSS} />);
    expect(screen.getByText('A IA está trabalhando…')).toBeVisible();
    expect(container.querySelector('script, img')).toBeNull();
    expect(container).toHaveTextContent('<script>');
  });

  it('source quote is escaped text', () => {
    const { container } = render(<AiSource quote={XSS} />);
    expect(container.querySelector('script, img')).toBeNull();
    expect(screen.getByText(/Fonte/)).toBeVisible();
  });

  it('fallback says it was the automatic correction without AI', () => {
    render(<AiNotice ai={{ status: 'fallback', code: 'provider_error', message: null }} />);
    expect(screen.getByText(/correção automática, sem IA/)).toBeVisible();
  });

  it('error shows the friendly message, retries, and reports only the error type', async () => {
    const onRetry = vi.fn();
    const { container } = render(<AiNotice ai={{ status: 'error', code: 'timeout', message: 'Demorou demais. Tente de novo.' }} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Demorou demais. Tente de novo.');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(trackAi).toHaveBeenCalledWith('ai_error_shown', { type: 'timeout' });
    expect(await violations(container)).toEqual([]);
  });

  it('limit tells when it resets and links to the plans', () => {
    render(<AiNotice ai={{ status: 'error', code: 'quota_exceeded', message: null, quota: { key: 'ai_grades', used: 5, limit: 5, remaining: 0, nearLimit: true, period: '2026-10-06' } }} />);
    expect(screen.getByText(/meia-noite/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', expect.stringContaining('/app/planos'));
  });

  it('rate limit asks to wait, with no plans link', () => {
    render(<AiNotice ai={{ status: 'error', code: 'rate_limited', message: null }} />);
    expect(screen.getByText(/Aguarde um instante/)).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Ver planos' })).toBeNull();
  });

  it('warns at 80% with what is left', () => {
    render(<AiNotice ai={{ status: 'ok', code: null, message: null, quota: { key: 'ai_grades', used: 16, limit: 20, remaining: 4, nearLimit: true, period: '2026-10-06' } }} />);
    expect(screen.getByText(/80%.*Restam 4/)).toBeVisible();
  });

  it('renders nothing for a plain ok result', () => {
    const { container } = render(<AiNotice ai={{ status: 'ok', code: null, message: null }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('FlagGradeButton', () => {
  it('posts the flag without a body, confirms, and tracks without content', async () => {
    api.mockResolvedValue({ ok: true, data: {} });
    const { container } = render(<FlagGradeButton gradeId="g1" />);
    expect(await violations(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Essa correção está errada' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Obrigado'));
    expect(api).toHaveBeenCalledWith('/v1/ai/grades/g1/flag', expect.objectContaining({ method: 'POST', body: '{}' }));
    expect(trackAi).toHaveBeenCalledWith('ai_grade_flagged', {});
  });

  it('shows an error and lets the student try again', async () => {
    api.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ ok: true, data: {} });
    render(<FlagGradeButton gradeId="g1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Essa correção está errada' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não conseguimos enviar');
    fireEvent.click(screen.getByRole('button', { name: 'Essa correção está errada' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Obrigado'));
  });
});
