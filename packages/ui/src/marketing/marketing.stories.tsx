import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  BentoTile, CompareMark, FeatureComparison, FeatureExplorer, Marquee, PlanCards, ProgressLine, QuestionAccordion,
  Section, SiteFooter, SiteHeader, StepCard, WaitlistForm, type PlanCardPeriod, type WaitlistState,
} from './index';
import { Icon } from '../icons';

/**
 * Marketing (F16 T1). Regras: todo texto entra por props (o app passa t('landing.*')); sem className; movimento só por CSS
 * (`motion.css`): revelações e a linha de progresso usam `animation-timeline: view()` e ficam visíveis sem suporte
 * (gancho `data-reveal` documentado em Reveal); com "Reduzir movimento" tudo fica estático e a faixa perde o botão de pausa.
 * Seções: use `Section` com `tone` canvas, surface (planos) ou dark (recursos). Âncoras têm `scroll-margin-top: 92px` (cabeçalho de 76 px).
 * `FeatureExplorer` e `WaitlistForm` são para fundo escuro. O acordeão de perguntas e a tabela têm nomes próprios (`QuestionAccordion`,
 * `FeatureComparison`) porque `Accordion` e `ComparisonTable` já existem no design system.
 */
const meta = { title: 'Marketing/Landing', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type S = StoryObj;

const features = ['Mapa de conceitos', 'Quatro tipos de card', 'Desafio dentro do mapa', 'Correção com fonte', 'Lembrança estimada', 'Cobertura do Enamed'].map((title, i) => ({
  id: `f${i}`, title, description: 'Monte o que você entende, não só o que decorou. Cada conexão tem nome, e o nome vira pergunta no desafio.',
  benefits: ['Arraste, ligue e dê nome às conexões', 'Camadas: Estrutura, Lembrança e Cobertura', 'Salva sozinho e organiza o layout'],
  image: { src: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="640" height="420" fill="#f3f2fb"/><circle cx="${120 + i * 70}" cy="210" r="60" fill="#6d5bd0"/></svg>`)}`, alt: `Imagem do recurso ${title}`, width: 640 as const, height: 420 as const },
}));

export const Secoes: S = {
  render: () => (
    <div className="bg-canvas pb-20">
      <Section id="problema" eyebrow="O problema" title="Decorar card solto é esquecer em rede." lead="Texto de apoio opcional.">
        <div className="grid gap-6 md:grid-cols-3">
          {['Cards soltos', 'Revisão sem contexto', 'Sem saber onde está'].map((t) => <BentoTile key={t} title={t} text="Explicação curta do problema." />)}
        </div>
      </Section>
      <Section id="como-funciona" eyebrow="Como funciona" title="Conecte. Revise. Evolua.">
        <ProgressLine />
        <div className="grid gap-8 md:grid-cols-3">
          {['Conectar', 'Revisar', 'Evoluir'].map((t, i) => <StepCard key={t} number={`0${i + 1}`} title={t} text="Uma linha explicando o passo." thumbnail={<span className="absolute inset-6 rounded-[14px] border-2 border-primary bg-surface" />} />)}
        </div>
      </Section>
    </div>
  ),
};

export const FaixaMapasProntos: S = {
  render: () => (
    <div className="bg-canvas py-10">
      <Marquee label="Mapas prontos" pauseLabel="Pausar faixa" playLabel="Retomar faixa" items={['Sepse e choque séptico', 'Insuficiência cardíaca', 'Pneumonia', 'Cetoacidose diabética', 'Hipertensão arterial'].map((t) => (
        <span key={t} className="flex h-12 items-center gap-2.5 rounded-full border border-border bg-surface pr-5 pl-4 text-[15px] font-semibold whitespace-nowrap"><Icon name="maps" size={20} />{t}</span>
      ))} />
    </div>
  ),
};

export const Recursos: S = {
  render: () => <Section id="recursos" tone="dark" eyebrow="Recursos" title="Tudo o que o seu estudo precisa, no mesmo mapa." lead="Escolha um recurso e veja como ele aparece dentro da plataforma."><FeatureExplorer items={features} tablistLabel="Recursos" /></Section>,
};

export const EMaisBento: S = {
  render: () => (
    <Section id="mais" eyebrow="E tem mais" title="Do seu material ao celular.">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="md:col-span-7"><BentoTile title="Do seu Anki e dos seus PDFs" text="Importe o .apkg e seus cards viram um mapa." image={<img src={features[0]!.image.src} alt="Um PDF e um arquivo do Anki virando um mapa" width={640} height={420} />} /></div>
        <div className="md:col-span-5"><BentoTile title="Mapas prontos, revisados" text="Com fonte, versão e revisor." image={<img src={features[1]!.image.src} alt="Mapas prontos com selo de revisão" width={640} height={420} />} /></div>
        <div className="md:col-span-5"><BentoTile dark title="No celular, até por voz" text="Revise um desafio por vez." image={<img src={features[2]!.image.src} alt="A revisão no celular" width={640} height={420} />} /></div>
        <div className="md:col-span-7"><BentoTile title="Procedência em cada card" text="Fonte, marco temporal e revisor."><dl className="m-0 flex flex-col rounded-[26px] bg-canvas px-5"><div className="flex justify-between gap-4 border-b border-border py-4"><dt className="text-muted">Fonte</dt><dd className="m-0 font-bold">Surviving Sepsis Campaign 2021</dd></div><div className="flex justify-between gap-4 py-4"><dt className="text-muted">Versão</dt><dd className="m-0 font-bold">v1.2</dd></div></dl></BentoTile></div>
      </div>
    </Section>
  ),
};

export const Comparacao: S = {
  render: () => (
    <Section id="comparacao" eyebrow="Comparação" title="Use com o Anki. Ou no lugar dele.">
      <FeatureComparison caption="Remoa, Anki e Notion e Miro" columns={['Remoa', 'Anki', 'Notion e Miro']} scrollLabel="Tabela de comparação, role para os lados" highlightColumn={0}
        rows={[
          { feature: 'Revisão espaçada', cells: [<CompareMark key="1" kind="brand" label="Sim" />, <CompareMark key="2" kind="yes" label="Sim" />, <CompareMark key="3" kind="no" label="Não" />] },
          { feature: 'Mapa de conexões', cells: [<CompareMark key="1" kind="brand" label="Sim" />, <CompareMark key="2" kind="no" label="Não" />, <CompareMark key="3" kind="yes" label="Sim" />] },
          { feature: 'Importa o seu deck', cells: [<CompareMark key="1" kind="brand" label="Sim" />, <span key="2" className="text-sm font-semibold text-muted">É o deck</span>, <CompareMark key="3" kind="no" label="Não" />] },
        ]} />
    </Section>
  ),
};

function Plans({ initial }: { initial: PlanCardPeriod }) {
  const [period, setPeriod] = useState<PlanCardPeriod>(initial);
  const annual = period === 'annual';
  return (
    <Section id="planos" tone="surface" eyebrow="Planos" title="Comece grátis. Pague quando o mapa virar hábito.">
      <PlanCards period={period} onPeriodChange={setPeriod} periodLabels={{ monthly: 'Mensal', annual: 'Anual' }} periodGroupLabel="Período de cobrança" discountLabel="-25%"
        plans={[
          { name: 'Free', price: { amount: 0, currency: 'BRL' }, cadence: '', description: 'Para começar a montar seus mapas.', features: ['2 mapas', '200 cards', '20 correções por dia'], cta: <a href="#cta" className="border-[1.5px] border-border-strong bg-surface text-ink">Começar grátis</a> },
          { name: 'Pro', price: { amount: annual ? 349 : 39, currency: 'BRL' }, cadence: annual ? '/ano' : '/mês', note: annual ? 'Equivale a R$ 29,08 por mês.' : 'Cobrado todo mês.', badge: 'Preço de fundador', dark: true, features: ['Mapas e cards ilimitados', 'Correções por IA sem limite', 'Mapas de PDF'], cta: <a href="#cta" className="bg-surface text-panel-dark">Assinar o Pro</a> },
        ]} />
    </Section>
  );
}
export const PlanosMensal: S = { render: () => <Plans initial="monthly" /> };
export const PlanosAnual: S = { render: () => <Plans initial="annual" /> };

export const Perguntas: S = {
  render: () => (
    <Section id="faq" eyebrow="Perguntas" title="O que os alunos perguntam.">
      <QuestionAccordion defaultOpenId="a" items={['a', 'b', 'c'].map((id, i) => ({ id, question: `Pergunta frequente ${i + 1}?`, answer: 'Resposta com algumas linhas de texto para mostrar a animação de altura em 400 ms e o ícone girando 45 graus.' }))} />
    </Section>
  ),
};

function Waitlist({ initial }: { initial: WaitlistState }) {
  const [state, setState] = useState<WaitlistState>(initial);
  const [email, setEmail] = useState('');
  const [segment, setSegment] = useState('internato');
  return (
    <div className="flex flex-col items-center gap-5 rounded-[44px] bg-panel-dark px-6 py-20 text-center text-on-dark">
      <h2 className="m-0 font-display text-5xl font-extrabold tracking-[-0.04em]">O que você aprende, fica.</h2>
      <WaitlistForm state={state} email={email} onEmailChange={setEmail} segment={segment} onSegmentChange={setSegment}
        onSubmit={(v) => { setState('submitting'); setTimeout(() => setState(v.email.includes('@') ? 'success' : 'error'), 600); }}
        emailLabel="Seu e-mail" emailPlaceholder="seu@email.com" segmentLabel="Seu momento" submitLabel="Entrar na lista" submittingLabel="Enviando"
        segments={[{ value: 'ciclo', label: '3º–4º ano' }, { value: 'internato', label: '5º–6º ano' }, { value: 'formado', label: 'Formado(a)' }]}
        error={state === 'error' ? 'Escreva um e-mail válido.' : undefined} successTitle="Você está na lista." successText="Avisamos por e-mail quando abrirmos."
        resetLabel="Usar outro e-mail" onReset={() => { setEmail(''); setState('idle'); }} honeypotLabel="Não preencha este campo" />
    </div>
  );
}
export const ListaDeEspera: S = { render: () => <Waitlist initial="idle" /> };
export const ListaDeEsperaErro: S = { render: () => <Waitlist initial="error" /> };
export const ListaDeEsperaSucesso: S = { render: () => <Waitlist initial="success" /> };

const brand = <a href="#topo" aria-label="Remoa, início" className="font-display text-[27px] font-extrabold tracking-[-0.05em] text-primary no-underline">remoa</a>;
export const CabecalhoRodape: S = {
  render: () => (
    <div className="min-h-[600px] bg-canvas pt-[76px]">
      <SiteHeader brand={brand} navLabel="Principal" menuLabel="Abrir menu"
        links={[{ href: '#como-funciona', label: 'Como funciona', active: true }, { href: '#recursos', label: 'Recursos' }, { href: '#planos', label: 'Planos' }, { href: '#faq', label: 'Perguntas' }]}
        actions={<><a href="/entrar" className="flex h-11 items-center px-4 text-[15px] font-bold text-ink no-underline">Entrar</a><a href="#cta" className="lift flex h-12 items-center rounded-[15px] bg-primary px-[22px] text-[15px] font-bold text-on-primary no-underline">Criar meu primeiro mapa</a></>} />
      <div className="h-[300px]" />
      <SiteFooter brand={brand} tagline="Conecte para lembrar." navLabel="Rodapé" disclaimer="Ferramenta de estudo. Não substitui diretriz clínica nem supervisão." copyright="© 2026 Remoa"
        links={[{ title: 'Produto', items: [{ href: '#como-funciona', label: 'Como funciona' }, { href: '#planos', label: 'Planos' }] }, { title: 'Legal', items: [{ href: '/termos', label: 'Termos de uso' }, { href: '/privacidade', label: 'Privacidade' }, { href: '/contato', label: 'Contato' }] }]} />
    </div>
  ),
};
