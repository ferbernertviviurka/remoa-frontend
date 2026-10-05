import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../button';
import { SupportFab, SupportModal, TypeChips, ContextDisclosure, FileChip, Thread, TicketList, SupportSuccess, StatusPill } from './index';

/**
 * Suporte (F19). Referência: `docs/design/v2/screens/suporte-modal.png` e `suporte-chamados.png` (1440 × 900).
 * Todo texto chega por props (aqui, exemplos); no app vem de `@remoa/strings` (`support.*`). Movimento: `data-motion="reduced"` na raiz mostra o quadro final.
 * Regras de uso: (1) o botão flutuante vai uma vez no layout `(app)`, nunca nas telas cheias (editor, desafio, novo mapa); (2) `SupportModal` é só a casca: a tela troca o conteúdo
 * conforme `activeTab` (formulário, sucesso, lista, conversa); (3) `dirty` + `onDirtyClose` evitam perder texto digitado; (4) o contexto técnico lista exatamente o que o servidor grava,
 * nunca mapas, senha, tokens ou cobrança.
 */
const meta = { title: 'Suporte/Componentes', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

export const BotaoFlutuante: S = { render: () => <><SupportFab label="Suporte" aria-label="Abrir suporte, 1 resposta" unread={1} /><SupportFab label="Suporte" aria-label="Abrir suporte" style={{ bottom: 108 }} /></> };

const types = [{ value: 'bug', label: 'Algo não funciona' }, { value: 'billing', label: 'Cobrança e plano' }, { value: 'content', label: 'Conteúdo médico' }, { value: 'idea', label: 'Sugestão' }, { value: 'other', label: 'Outro' }];
export const TiposDeChamado: S = {
  render: function Render() {
    const [v, setV] = useState('');
    return <div className="max-w-[564px]"><TypeChips legend="Sobre o que é?" groupLabel="Tipo de chamado" options={types} value={v} onChange={setV} /></div>;
  },
};

export const InformacoesTecnicas: S = {
  render: function Render() {
    const [on, setOn] = useState(true);
    const items = on ? [{ k: 'Tela atual', v: 'Hoje' }, { k: 'Plano', v: 'Free' }, { k: 'Navegador', v: 'Chrome 129 no macOS' }, { k: 'Versão do app', v: '0.1.0' }, { k: 'Fuso horário', v: 'Brasília (GMT−3)' }] : [{ k: 'Informações técnicas', v: 'Não serão enviadas' }];
    return <div className="max-w-[564px]"><ContextDisclosure title="Informações técnicas enviadas junto" switchLabel="Incluir informações técnicas" enabled={on} onEnabledChange={setOn} items={items} note="Nunca enviamos o conteúdo dos seus mapas nem a sua senha." /></div>;
  },
};

export const Anexos: S = { render: () => <div className="flex gap-2"><FileChip name="captura-1.png" removeLabel="Remover captura-1.png" onRemove={() => undefined} /><FileChip name="erro.jpg" removeLabel="Remover erro.jpg" onRemove={() => undefined} /></div> };

export const Conversa: S = {
  render: () => (
    <div className="max-w-[576px]">
      <Thread aria-label="Conversa do chamado #1038" messages={[
        { id: '1', author: 'Você', when: '1 out', body: 'Não consigo importar meu .apkg.', side: 'self' },
        { id: '2', author: 'Equipe Remoa', when: '1 out', body: 'Oi! O arquivo tem mais de 200 MB? Pode mandar uma captura?', side: 'other' },
      ]} />
    </div>
  ),
};

/** Variante admin: balões de 76% com borda; a nota interna é âmbar e nunca aparece para o usuário. */
export const ConversaAdminComNotaInterna: S = {
  render: () => (
    <div className="max-w-[760px] bg-canvas p-6">
      <Thread variant="admin" aria-label="Conversa do chamado #1044" internalLabel="Nota interna" messages={[
        { id: '1', author: 'Hugo Pires', when: 'há 18 min', body: 'Importei meu deck e, ao mover os cards, o mapa diz que não salvou.', side: 'other' },
        { id: '2', author: 'Você', when: 'agora', body: 'Reproduzi no Chrome 129; abrir bug no editor.', side: 'self', internal: true },
        { id: '3', author: 'Você', when: 'agora', body: 'Oi, Hugo! Estamos vendo isso agora.', side: 'self' },
      ]} />
    </div>
  ),
};

export const MeusChamados: S = {
  render: () => (
    <div className="max-w-[576px]">
      <TicketList aria-label="Meus chamados" emptyText="Você ainda não abriu nenhum chamado." onSelect={() => undefined} items={[
        { id: '1038', subject: 'Não consigo importar meu .apkg', meta: '#1038 · Algo não funciona · 1 out', statusLabel: 'Respondido', status: 'ok', unread: true, unreadLabel: 'Resposta não lida' },
        { id: '1021', subject: 'Cobrança duplicada no Pix', meta: '#1021 · Cobrança e plano · 24 set', statusLabel: 'Resolvido', status: 'muted' },
      ]} />
    </div>
  ),
};

export const Estados: S = { render: () => <div className="flex gap-2"><StatusPill tone="warn">Aberto</StatusPill><StatusPill tone="info">Em análise</StatusPill><StatusPill tone="ok">Respondido</StatusPill><StatusPill tone="muted">Resolvido</StatusPill><StatusPill tone="bad">Falhou</StatusPill></div> };

export const Sucesso: S = {
  render: () => <div className="max-w-[620px] rounded-[34px] border border-border bg-surface"><SupportSuccess title="Chamado #1042 enviado." text="Recebemos o seu relato. A resposta chega por e-mail e também em Meus chamados." actions={<><Button>Ver meus chamados</Button><Button variant="secondary">Fechar</Button></>} /></div>,
};

/** Modal completo (clique no botão). Esc ou clique fora fecham; com `dirty`, pedem confirmação. */
export const ModalCompleto: S = {
  render: function Render() {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState('novo');
    const [type, setType] = useState('');
    const [on, setOn] = useState(true);
    return (
      <>
        <SupportFab label="Suporte" aria-label="Abrir suporte, 1 resposta" unread={1} onClick={() => setOpen(true)} />
        <SupportModal open={open} onOpenChange={setOpen} title="Fale com o suporte" description="Conte o que aconteceu. A resposta chega por e-mail e também aqui." closeLabel="Fechar" tabsLabel="Suporte" activeTab={tab} onTabChange={setTab} tabs={[{ value: 'novo', label: 'Novo chamado' }, { value: 'chamados', label: 'Meus chamados', count: 1 }]}>
          {tab === 'novo' ? (
            <div className="flex flex-col gap-[18px] px-7 pb-[26px] pt-[22px]">
              <TypeChips legend="Sobre o que é?" groupLabel="Tipo de chamado" options={types} value={type} onChange={setType} />
              <ContextDisclosure title="Informações técnicas enviadas junto" switchLabel="Incluir informações técnicas" enabled={on} onEnabledChange={setOn} items={[{ k: 'Tela atual', v: 'Hoje' }, { k: 'Plano', v: 'Free' }]} note="Nunca enviamos o conteúdo dos seus mapas nem a sua senha." />
            </div>
          ) : (
            <div className="px-[22px] pb-6 pt-[18px]"><TicketList aria-label="Meus chamados" emptyText="Nenhum chamado." onSelect={() => undefined} items={[{ id: '1038', subject: 'Não consigo importar meu .apkg', meta: '#1038 · Algo não funciona · 1 out', statusLabel: 'Respondido', status: 'ok', unread: true, unreadLabel: 'Resposta não lida' }]} /></div>
          )}
        </SupportModal>
      </>
    );
  },
};
