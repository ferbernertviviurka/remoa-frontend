'use client';

import { t } from '@remoa/strings/landing';
import { QuestionAccordion, Section } from '@remoa/ui';
import { track } from '@/lib/analytics';

/** Já filtrada e resolvida (`a` vs `aApproved`) pela página, a mesma lista do JSON-LD. */
export type FaqItem = { q: string; a: string };

/** Perguntas (FR-13): o primeiro aberto, um por vez. `items` é a mesma lista do JSON-LD. */
export function FaqSection({ items }: { items: readonly FaqItem[] }) {
  return (
    <Section id="faq" eyebrow={t('landing.faq.eyebrow')} title={t('landing.faq.title')}>
      <QuestionAccordion
        defaultOpenId="0"
        items={items.map((it, i) => ({ id: String(i), question: it.q, answer: it.a }))}
        onToggle={(id, open) => { if (open) track('faq_opened', { index: Number(id) }); }}
      />
    </Section>
  );
}
