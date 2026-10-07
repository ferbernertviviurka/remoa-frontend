import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';

const t = withStrings({ mapLibrary: more.mapLibrary });

export type Didactics = {
  porQue?: string;
  macete?: { tipo: string; texto: string; explicacao: string };
  pegadinha?: string;
  naProva?: string;
  naDiretriz?: { texto: string; data: string };
};
export type SeedCardData = {
  title: string; front: string | null; back: string | null;
  didactics?: Didactics | null; sources: { doc: string; local: string }[];
};

const Line = ({ label, children }: { label: string; children: string }) => (
  <p className="m-0 text-sm"><strong>{label}:</strong> {children}</p>
);

/** Card of a ready-made map: the content plus its didactics and sources. Shared by the in-app Ver and the public sample (F31). */
export function SeedCardBody({ card }: { card: SeedCardData }) {
  const d = card.didactics;
  return (
    <>
      <h3 className="m-0 font-semibold">{card.title}</h3>
      {card.front ? <p className="m-0">{card.front}</p> : null}
      {card.back ? <p className="m-0 text-muted">{card.back}</p> : null}
      {d?.porQue ? <Line label={t('mapLibrary.why')}>{d.porQue}</Line> : null}
      {d?.macete ? <Line label={t('mapLibrary.macete')}>{`${d.macete.texto}. ${d.macete.explicacao}`}</Line> : null}
      {d?.pegadinha ? <Line label={t('mapLibrary.pitfall')}>{d.pegadinha}</Line> : null}
      {d?.naProva ? <Line label={t('mapLibrary.inExam')}>{d.naProva}</Line> : null}
      {d?.naDiretriz ? <Line label={t('mapLibrary.inGuideline', { date: d.naDiretriz.data })}>{d.naDiretriz.texto}</Line> : null}
      {card.sources.length ? <p className="m-0 text-sm text-muted">{t('mapLibrary.sources', { list: card.sources.map((s) => `${s.doc} ${s.local}`).join('; ') })}</p> : null}
    </>
  );
}
