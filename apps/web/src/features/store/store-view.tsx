'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AccountSnapshot } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Accordion, Button, Eyebrow, Icon, LockedListingCard, SoonBanner, SoonSeal, SplitSimulator, StatusTrack, StepList, StoreHeroArt, StoreLink, StoreTabs, Tag } from '@remoa/ui';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { storeApi, type StoreConfig, type StoreWaitlistEntry } from './api';
import { WaitlistForm } from './waitlist-form';

const brl = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const h2 = 'm-0 font-display text-[26px] md:text-[30px] lg:text-[34px] font-extrabold leading-tight tracking-[-0.03em]';
const section = 'flex flex-col gap-6';
const buyKeys = ['s1', 's2', 's3'] as const;
const faqKeys = ['q1', 'q2', 'q3', 'q4'] as const;
const listings = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'] as const;
// Selo por exemplo (fictício): V = médico verificado, VF = médica verificada, P/PF = professor(a), R = residente, A = aluno.
const badges = { l1: 'verified', l2: 'teacherF', l3: 'resident', l4: 'verifiedF', l5: 'teacher', l6: 'student' } as const;

export function StoreView() {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [configFailed, setConfigFailed] = useState(false);
  useEffect(() => {
    void storeApi.config().then((r) => { if (r.ok) setConfig(r.data); else setConfigFailed(true); }).catch(() => setConfigFailed(true));
    track('store_viewed', {});
  }, []);
  // FR-14: só `soon` é implementado; os outros estados ficam para a Fase B.
  if (config && config.status !== 'soon') return null;
  return <SoonPage sellerPct={config?.splitSellerPct ?? null} configFailed={configFailed} />;
}

function SoonPage({ sellerPct, configFailed }: { sellerPct: number | null; configFailed: boolean }) {
  const [tab, setTab] = useState('buy');
  const [price, setPrice] = useState(49);
  const usedSim = useRef(false);
  const steps = (kind: 'buySteps' | 'sellSteps') => buyKeys.map((k) => ({ title: t(`store.how.${kind}.${k}.title`), desc: t(`store.how.${kind}.${k}.desc`) }));
  const who = ['teacher', 'student', 'doctor'] as const;
  const whoIcon = { teacher: 'book', student: 'users', doctor: 'shield' } as const;
  return (
    <div className="mx-auto flex w-full max-w-[1256px] flex-col gap-16 pb-16">
      <div className="flex flex-col gap-9">
      <SoonBanner text={t('store.notice')} seal={t('store.soonSeal')} />

      <section aria-labelledby="h-loja" className="relative flex min-h-[420px] items-center justify-between gap-6 overflow-hidden rounded-[40px] bg-panel-dark p-8 text-on-dark md:p-12">
        <div className="flex max-w-[600px] flex-col items-start gap-[18px]">
          <span className="flex items-center gap-3"><span className="text-xs font-bold uppercase tracking-[.12em] text-on-dark-muted">{t('store.hero.eyebrow')}</span><SoonSeal>{t('store.soonSeal')}</SoonSeal></span>
          <h1 id="h-loja" className="m-0 font-display text-[36px] font-extrabold leading-[1.03] tracking-[-0.04em] md:text-[48px] lg:text-[58px]">
            {t('store.hero.titleStart')}{' '}
            <span className="relative isolate inline-block">{t('store.hero.titleEmph')}<span aria-hidden="true" className="absolute -inset-x-0.5 bottom-[.06em] -z-10 h-[.24em] rounded-md bg-primary" /></span>
          </h1>
          <p className="m-0 text-[19px] leading-normal text-on-dark-muted-2">{t('store.hero.lead')}</p>
          <div className="mt-1.5 flex flex-wrap gap-3">
            <StoreLink onDark href="#lista" icon={<Icon name="clock" size={20} />}>{t('store.hero.join')}</StoreLink>
            <StoreLink onDark href="#vender" variant="secondary" onClick={() => track('store_sell_cta_clicked', {})}>{t('store.hero.sell')}</StoreLink>
          </div>
        </div>
        <StoreHeroArt />
      </section>
      </div>

      <section aria-labelledby="t-status" className={section}>
        <h2 id="t-status" className={h2}>{t('store.status.title')}</h2>
        <StatusTrack items={(['waitlist', 'sellers', 'open'] as const).map((k) => ({ title: t(`store.status.items.${k}.title`), desc: t(`store.status.items.${k}.desc`), chip: t(`store.status.items.${k}.chip`), now: k === 'waitlist' }))} />
      </section>

      <section aria-labelledby="t-como" className={section}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2"><Eyebrow>{t('store.how.eyebrow')}</Eyebrow><h2 id="t-como" className={h2}>{t('store.how.title')}</h2></div>
        </div>
        <StoreTabs
          label={t('store.how.tabsLabel')}
          value={tab}
          onValueChange={setTab}
          tabs={[
            { value: 'buy', label: t('store.how.buy'), content: <StepList key="buy" steps={steps('buySteps')} /> },
            { value: 'sell', label: t('store.how.sell'), content: <StepList key="sell" steps={steps('sellSteps')} /> },
          ]}
        />
      </section>

      <section id="vender" aria-labelledby="t-quem" className={section}>
        <div className="flex flex-col gap-2"><Eyebrow>{t('store.who.eyebrow')}</Eyebrow><h2 id="t-quem" className={h2}>{t('store.who.title')}</h2></div>
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
          {who.map((k) => (
            <li key={k} className="flex flex-col items-start gap-3 rounded-list border border-border bg-surface p-5">
              <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-[14px] bg-primary-tint text-primary-deep"><Icon name={whoIcon[k]} size={22} /></span>
              <h3 className="m-0 font-display text-lg font-extrabold">{t(`store.who.${k}.title`)}</h3>
              <p className="m-0 text-sm text-muted">{t(`store.who.${k}.desc`)}</p>
              <Tag tone="steady">{t(`store.who.${k}.badge`)}</Tag>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="t-split" className={section}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2"><Eyebrow>{t('store.split.eyebrow')}</Eyebrow><h2 id="t-split" className={h2}>{t('store.split.title')}</h2></div>
          <Tag tone="watch">{t('store.split.example')}</Tag>
        </div>
        {sellerPct == null ? (configFailed ? <p role="status" className="m-0 text-muted">{t('store.split.unavailable')}</p> : null) : (
          <SplitSimulator
            priceLabel={t('store.split.price')}
            price={price}
            onPriceChange={(p) => {
              setPrice(p);
              if (!usedSim.current) { usedSim.current = true; track('store_simulator_used', { band: p < 60 ? 'low' : p < 120 ? 'mid' : 'high' }); }
            }}
            sellerPct={sellerPct}
            formatMoney={brl}
            labels={{
              buyer: t('store.split.buyer'), payment: t('store.split.payment'), you: t('store.split.you'), brand: t('store.split.brand'), seller: t('store.split.seller'), platform: t('store.split.platform'),
              sellerLegend: t('store.split.sellerLegend', { pct: sellerPct }), platformLegend: t('store.split.platformLegend', { pct: 100 - sellerPct }), note: t('store.split.note'),
            }}
          />
        )}
      </section>

      <section aria-labelledby="t-prev" className={section}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2"><Eyebrow>{t('store.preview.eyebrow')}</Eyebrow><h2 id="t-prev" className={h2}>{t('store.preview.title')}</h2></div>
          <span className="flex items-center gap-2 text-sm font-semibold text-muted"><Icon name="lock" size={16} />{t('store.preview.banner')}</span>
        </div>
        <div aria-disabled="true" aria-label={t('store.preview.filtersLabel')} role="group" className="pointer-events-none flex select-none flex-wrap gap-2 opacity-60">
          {(['all', 'cm', 'cir', 'ped', 'go', 'mp'] as const).map((k) => <Tag key={k} tone="unknown">{t(`store.preview.filters.${k}`)}</Tag>)}
        </div>
        <div className="relative">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((k, i) => (
              <LockedListingCard
                key={k}
                delayMs={(i % 3) * 90}
                exampleLabel={t('store.preview.example')}
                title={t(`store.preview.listings.${k}.title`)}
                author={t(`store.preview.listings.${k}.author`)}
                badge={t(`store.preview.${badges[k]}`)}
                meta={t('store.preview.meta', { area: t(`store.preview.listings.${k}.area`), cards: t(`store.preview.listings.${k}.cards`), edges: t(`store.preview.listings.${k}.edges`) })}
                rating={t(`store.preview.listings.${k}.rating`)}
                ratingLabel={t('store.preview.rating', { rating: t(`store.preview.listings.${k}.rating`), count: t(`store.preview.listings.${k}.count`) })}
                priceMask={t('store.preview.priceMask')}
                priceLabel={t('store.preview.priceHidden')}
              />
            ))}
          </div>
          <div className="mt-6 flex justify-center"><StoreLink href="#lista" icon={<Icon name="mail" size={20} />}>{t('store.preview.notify')}</StoreLink></div>
        </div>
      </section>

      <section id="lista" aria-labelledby="t-lista" className="flex scroll-mt-6 flex-col gap-6 rounded-list border border-border bg-surface p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <Eyebrow>{t('store.waitlist.eyebrow')}</Eyebrow>
          <h2 id="t-lista" className={h2}>{t('store.waitlist.title')}</h2>
          <p className="m-0 max-w-xl text-muted">{t('store.waitlist.lead')}</p>
        </div>
        <WaitlistSection />
      </section>

      <section aria-labelledby="t-enq" className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col items-start gap-3">
          <Eyebrow>{t('store.meanwhile.eyebrow')}</Eyebrow>
          <h2 id="t-enq" className={h2}>{t('store.meanwhile.title')}</h2>
          <p className="m-0 text-muted">{t('store.meanwhile.lead')}</p>
          <StoreLink as={Link} href="/app/mapas" variant="secondary" iconEnd={<Icon name="right" size={18} />}>{t('store.meanwhile.cta')}</StoreLink>
        </div>
        <Accordion onValueChange={(v) => { const i = faqKeys.indexOf(v as (typeof faqKeys)[number]); if (i >= 0) track('store_faq_opened', { item: i }); }} items={faqKeys.map((k) => ({ value: k, title: t(`store.meanwhile.faq.${k}.q`), content: t(`store.meanwhile.faq.${k}.a`) }))} />
      </section>
    </div>
  );
}

function WaitlistSection() {
  const [state, setState] = useState<{ email: string; entry: StoreWaitlistEntry | null } | 'error' | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    const done = (v: { email: string; entry: StoreWaitlistEntry | null } | 'error') => { if (live) setState(v); };
    // O GET das respostas atuais é opcional: se só ele falhar o formulário continua usável (vazio).
    void Promise.all([storeApi.getWaitlist().catch(() => null), api<AccountSnapshot>('/v1/account/me').catch(() => null)]).then(([w, me]) => {
      if (w === null || !w.ok) {
        if (me?.ok) done({ email: me.data.email, entry: null });
        else done('error');
      } else done({ email: me?.ok ? me.data.email : '', entry: w.data });
    });
    return () => { live = false; };
  }, [attempt]);
  if (!state) return <p role="status" className="m-0 text-muted">{t('store.waitlist.loading')}</p>;
  if (state === 'error') {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="m-0">{t('store.waitlist.errLoad')}</p>
        <Button variant="secondary" onClick={() => { setState(null); setAttempt((n) => n + 1); }}>{t('store.waitlist.retry')}</Button>
      </div>
    );
  }
  return <WaitlistForm accountEmail={state.email} entry={state.entry} onSaved={(entry) => setState({ ...state, entry })} />;
}
