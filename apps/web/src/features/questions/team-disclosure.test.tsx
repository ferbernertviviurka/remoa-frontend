import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { QuestionPublic, QuestionTeamDisclosure } from '@remoa/contracts';
import { canSelectQuestion, isCatalogOnly, TeamDisclosure } from './team-disclosure';

const disclosure: QuestionTeamDisclosure = { kind: 'remoa_team_attested', rightsStatus: 'pending', medicalReview: false, explanationStatus: 'absent', professionCode: 'nursing', flags: [], resolutionEligible: true, declarationDate: '2026-10-19' };
const question = (extra: Partial<QuestionPublic> = {}) => ({ id: '00000000-0000-4000-8000-000000000001', canonicalId: '00000000-0000-4000-8000-000000000001', version: 1, type: 'objective', stem: 'Enunciado sintético', alternatives: [{ key: 'A', text: 'Primeira' }, { key: 'B', text: 'Segunda' }], origin: 'official_exam', visibility: 'public', availability: 'active', difficulty: 'medium', topicId: null, areaId: null, sourceId: null, sourceLabel: null, reviewed: true, assets: [], boardId: null, cardIds: [], createdAt: new Date(), ...extra }) as QuestionPublic;
afterEach(cleanup);

describe('signed team publication eligibility', () => {
  it.each(['annulled', 'key_conflict', 'image_missing'] as const)('keeps a signed %s item readable without an answer or scored selection', flag => {
    const q = question({ teamDisclosure: { ...disclosure, flags: [flag], resolutionEligible: false } });
    expect(canSelectQuestion(q)).toBe(false);
    expect(isCatalogOnly(q)).toBe(true);
    render(<TeamDisclosure question={q} />);
    expect(screen.getByText('Área: Enfermagem')).toBeInTheDocument();
    expect(document.body.textContent).toMatch(flag === 'annulled' ? /não conta na pontuação/ : /consulta/);
  });
  it('allows eligible team items without implying a final key or inventing an explanation', () => {
    const q = question({ teamDisclosure: { ...disclosure, flags: ['key_finality_unverified'] } });
    expect(canSelectQuestion(q)).toBe(true);
    expect(isCatalogOnly(q)).toBe(false);
    render(<TeamDisclosure question={q} />);
    expect(screen.getByText(/finalidade do gabarito não foi confirmada/)).toBeInTheDocument();
    expect(screen.getByText('Esta questão ainda não tem explicação comentada.')).toBeInTheDocument();
  });
  it.each([
    ['medicine', 'Medicina'], ['psychology', 'Psicologia'], ['dentistry', 'Odontologia'],
    ['nursing', 'Enfermagem'], ['physiotherapy', 'Fisioterapia'], ['pharmacy', 'Farmácia'],
    ['biomedicine', 'Biomedicina'], ['nutrition', 'Nutrição'],
    ['physical_education', 'Educação Física'], ['veterinary_medicine', 'Medicina Veterinária'],
  ] as const)('discloses the actual corpus profession %s without a medical fallback', (professionCode, label) => {
    render(<TeamDisclosure question={question({ teamDisclosure: { ...disclosure, professionCode } })} />);
    expect(screen.getByText(`Área: ${label}`)).toBeInTheDocument();
  });
  it('preserves existing non-team annulled study behavior', () => {
    const q = question({ availability: 'annulled' });
    expect(isCatalogOnly(q)).toBe(false);
    expect(canSelectQuestion(q)).toBe(true);
    render(<TeamDisclosure question={q} />);
    expect(document.body.textContent).toBe('');
  });
});
