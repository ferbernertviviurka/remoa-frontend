'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Keyboard } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/a11y';
import './slider.css';
import type { BoardSummary } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, Icon, LockedSlideCard, MapSlideCard, NewMapSlideCard, SliderArrows } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { PendingLink } from '@/features/shell/nav-pending';
import { useEntitlements } from '@/features/shell/entitlements';
import { buildMapSlides, type MapSlide } from '../slides';

const t = withStrings({ boards: more.boards, home: more.home });

const h2 = 'm-0 font-display font-extrabold text-[22px] tracking-[-0.025em] md:text-[26px]';

/** `data-motion` (saved preference) wins over the system setting, like motion.css. */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => {
      const pref = document.documentElement.dataset.motion;
      setReduced(pref === 'reduced' || (pref !== 'full' && mq.matches));
    };
    read();
    mq.addEventListener('change', read);
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    return () => { mq.removeEventListener('change', read); mo.disconnect(); };
  }, []);
  return reduced;
}

const keyOf = (s: MapSlide) => (s.kind === 'map' ? s.board.id : s.kind);

export function MapSlider({ maps }: { maps: BoardSummary[] }) {
  const { entitlements } = useEntitlements();
  const router = useRouter();
  const reduced = useReducedMotion();
  const ref = useRef<SwiperType | null>(null);
  const [nav, setNav] = useState({ begin: true, end: false, locked: false, index: 0, perView: 3 });
  const slides = buildMapSlides({ maps, entitlements });
  const sync = (s: SwiperType) => setNav({ begin: s.isBeginning, end: s.isEnd, locked: s.isLocked, index: s.activeIndex, perView: Number(s.params.slidesPerView) || 1 });
  const upgrade = (source: 'map_slider_lock') => { track('upgrade_clicked', { source }); router.push('/app/planos?de=map_slider_lock'); };
  const total = slides.length;
  const counter = total > 3 ? t('home.slider.counter', { from: nav.index + 1, to: Math.min(nav.index + nav.perView, total), total }) : undefined;

  return (
    <section aria-labelledby="home-maps" aria-roledescription="carrossel" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id="home-maps" className={h2}>{t('home.slider.title')}</h2>
        <div className="flex items-center gap-5">
          <SliderArrows
            prevLabel={t('home.slider.prevArrow')}
            nextLabel={t('home.slider.nextArrow')}
            onPrev={() => ref.current?.slidePrev()}
            onNext={() => ref.current?.slideNext()}
            prevDisabled={nav.begin || nav.locked}
            nextDisabled={nav.end || nav.locked}
            counter={counter}
          />
          <Link href="/app/mapas" className="inline-flex min-h-11 items-center font-bold text-primary-deep no-underline">{t('home.slider.viewAll')}</Link>
        </div>
      </div>
      <Swiper
        className="map-slider"
        modules={[A11y, Keyboard]}
        slidesPerView={1}
        slidesPerGroup={1}
        spaceBetween={20}
        speed={reduced ? 0 : 550}
        watchOverflow
        keyboard={{ enabled: true, onlyInViewport: true }}
        a11y={{
          containerMessage: t('home.slider.a11y.containerMessage'),
          slideLabelMessage: t('home.slider.a11y.slideLabelMessage'),
          prevSlideMessage: t('home.slider.prevArrow'),
          nextSlideMessage: t('home.slider.nextArrow'),
        }}
        breakpoints={{ 700: { slidesPerView: 2 }, 1100: { slidesPerView: 3 } }}
        onSwiper={(s) => { ref.current = s; sync(s); }}
        onSlideChange={(s) => {
          sync(s);
          if (s.previousIndex !== s.activeIndex) track('map_slider_navigated', { direction: s.activeIndex > s.previousIndex ? 'next' : 'prev', index: s.activeIndex });
        }}
        onResize={sync}
        onBreakpoint={sync}
        onLock={sync}
        onUnlock={sync}
      >
        {slides.map((s) => (
          <SwiperSlide key={keyOf(s)} onClick={() => track('map_slide_clicked', { kind: s.kind })}>
            {s.kind === 'map' ? (
              <MapSlideCard
                as={PendingLink}
                href={`/app/mapas/${s.board.id}`}
                aria-label={t('home.reviewOpenLabel', { mapa: s.board.title })}
                area={t(`boards.area.${s.board.area}`)}
                title={s.board.title}
                preview={s.board.preview}
                counts={s.board.stateCounts}
                stateBarLabel={t('boards.stateBarLabel', s.board.stateCounts)}
                meta={t('library.cardMeta', { cards: s.board.cardCount, edges: s.board.edgeCount })}
                due={{ text: t('library.dueToday', { n: s.board.dueCount }), tone: s.board.dueCount > 0 ? 'review' : 'unknown' }}
              />
            ) : s.kind === 'new' ? (
              <NewMapSlideCard
                as={PendingLink}
                href="/app/mapas/novo"
                aria-label={t('home.slider.newCard.aria')}
                title={t('home.slider.newCard.title')}
                text={s.remaining === null ? t('home.slider.newCard.text') : t('home.slider.newCard.freeRemaining', { n: s.remaining })}
              />
            ) : (
              <LockedSlideCard
                title={t('home.slider.lockedCard.title')}
                text={t('home.slider.lockedCard.text', { max: s.max })}
                cta={<Button icon={<Icon name="sparkle" size={20} />} onClick={() => upgrade('map_slider_lock')}>{t('nav.upgradeButton')}</Button>}
              />
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
