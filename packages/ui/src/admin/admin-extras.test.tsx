import { render, screen } from '@testing-library/react';
import { ExternalLinkButton, JsonDiff } from './index';
import { violations } from '../test-utils';

describe('ExternalLinkButton', () => {
  it('abre em nova aba com noopener', async () => {
    const { container } = render(<ExternalLinkButton href="https://dashboard.stripe.com/payments/pi_1" newTabLabel="(nova aba)">Abrir no Stripe</ExternalLinkButton>);
    const a = screen.getByRole('link', { name: /Abrir no Stripe/ });
    expect(a).toHaveAttribute('target', '_blank');
    expect(a.getAttribute('rel')).toContain('noopener');
    expect(await violations(container)).toEqual([]);
  });
});

describe('JsonDiff', () => {
  it('marca só as linhas que mudaram e não tem nenhum controle de edição', async () => {
    const { container } = render(<JsonDiff beforeLabel="Antes" afterLabel="Depois" before={{ status: 'paid', n: 1 }} after={{ status: 'refunded', n: 1 }} emptyText="Sem alterações" />);
    const changed = [...container.querySelectorAll('code[data-changed]')].map((c) => c.textContent?.replace(/\s+/g, ' ').trim());
    expect(changed).toEqual(['− "status": "paid",', '+ "status": "refunded",']);
    expect(container.querySelectorAll('input,textarea,button,[contenteditable]')).toHaveLength(0);
    expect(await violations(container)).toEqual([]);
  });
  it('lado nulo mostra o texto vazio', () => {
    render(<JsonDiff beforeLabel="Antes" afterLabel="Depois" before={null} after={{ a: 1 }} emptyText="Sem alterações" />);
    expect(screen.getByText('Sem alterações')).toBeInTheDocument();
  });
});

describe('ReasonDialog com children', () => {
  it('Confirmar fica travado enquanto confirmDisabled', async () => {
    const { ReasonDialog } = await import('./index');
    render(<ReasonDialog open onOpenChange={() => {}} title="T" summary="S" reasonLabel="Motivo" tooShortText="curto" errorText="erro" confirmLabel="Confirmar" cancelLabel="Cancelar" doneLabel="Ok" receiptText={(id) => id} onConfirm={async () => ({ auditId: 'a_1' })} confirmDisabled><p>extra</p></ReasonDialog>);
    expect(screen.getByText('extra')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  });
});
