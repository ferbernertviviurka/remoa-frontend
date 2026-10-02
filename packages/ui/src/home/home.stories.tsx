import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from '../icons';
import { sepsePreview } from '../fixtures-v2';
import { LockedSlideCard } from './locked-slide-card';
import { MapSlideCard } from './map-slide-card';
import { NewMapSlideCard } from './new-map-slide-card';
import { SliderArrows } from './slider-arrows';

/**
 * Cartões do carrossel "Continue de onde parou" (F14). Os três têm 312 px de altura. O Swiper e a lista de slides ficam no app;
 * aqui só os cartões e as setas. Texto sempre por props. `as` recebe o PendingLink/next/link do app.
 */
const meta = { title: 'Home/Carrossel' } satisfies Meta;
export default meta;
type S = StoryObj;

const counts = { review: 2, watch: 2, steady: 1, unknown: 1 };
const map = (title: string, due: boolean) => (
  <MapSlideCard href="/mapas/1" aria-label={`Abrir o mapa ${title}`} area="Clínica Médica" title={title} preview={sepsePreview} counts={counts} stateBarLabel="2 para revisitar, 2 a acompanhar, 1 mais estável, 1 sem revisões" meta="6 cards · 6 conexões" due={due ? { text: '2 vencem hoje', tone: 'review' } : { text: 'Em dia', tone: 'unknown' }} />
);
const blank = (text: string) => <NewMapSlideCard href="/mapas/novo" aria-label="Criar um novo mapa" title="Novo mapa" text={text} />;
const locked = (
  <LockedSlideCard title="Limite do plano Free" text="O Free permite até 2 mapas. Faça upgrade para criar o próximo."
    cta={<a href="/conta" className="flex h-11 items-center justify-center gap-2 rounded-[13px] bg-primary text-sm font-bold text-on-primary no-underline"><Icon name="sparkle" size={16} />Fazer upgrade</a>} />
);
const row = (...c: React.ReactNode[]) => <div className="grid grid-cols-3 gap-5 p-6">{c.map((n, i) => <div key={i}>{n}</div>)}</div>;

export const Free2Mapas: S = { render: () => row(map('Sepse', true), map('Insuficiência cardíaca', false), locked) };
export const Free1Mapa: S = { render: () => row(map('Sepse', true), blank('Você ainda pode criar 1 mapa no plano Free.'), locked) };
export const Free0Mapas: S = { render: () => row(blank('Você ainda pode criar 2 mapas no plano Free.'), locked) };
export const ProCartaoEmBranco: S = { render: () => row(map('Sepse', true), blank('Comece do zero, de um PDF ou do seu Anki.')) };

function SetasDemo() {
  const [i, setI] = useState(0);
  return <div className="p-6"><SliderArrows prevLabel="Mapas anteriores" nextLabel="Próximos mapas" counter={`${i + 1}–${i + 3} de 6`} prevDisabled={i <= 0} nextDisabled={i >= 3} onPrev={() => setI(i - 1)} onNext={() => setI(i + 1)} /></div>;
}
export const Setas: S = { render: () => <SetasDemo /> };
export const SetasDesabilitadas: S = { render: () => <div className="p-6"><SliderArrows prevLabel="Mapas anteriores" nextLabel="Próximos mapas" prevDisabled nextDisabled onPrev={() => undefined} onNext={() => undefined} /></div> };
