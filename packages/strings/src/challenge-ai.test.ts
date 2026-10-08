import { describe, expect, it } from 'vitest';
import { t } from './index';

describe('challengeAi (F32)', () => {
  it('resolve chaves principais', () => {
    expect(t('challengeAi.open')).toBe('Desafiar');
    expect(t('challengeAi.modalTitle')).toBe('Desafiar este mapa');
    expect(t('challengeAi.scope.card')).toBe('Este card');
    expect(t('challengeAi.format.generated')).toBe('A IA cria as perguntas');
    expect(t('challengeAi.difficulty.hard')).toBe('Difícil');
    expect(t('challengeAi.type.objective')).toBe('Objetiva (A a D)');
    expect(t('challengeAi.grading.end')).toBe('Corrigir no final');
    expect(t('challengeAi.verdict.partial')).toBe('Parcial');
    expect(t('challengeAi.aiCanErr')).toBe('A IA pode errar. Confira a fonte no card.');
    expect(t('challengeAi.reportSent')).toBe('Recebido. Um revisor vai analisar esta pergunta.');
    expect(t('challengeAi.shortfall', { got: 2, asked: 5 })).toBe('Entregamos 2 de 5 perguntas. As outras não ficaram fiéis ao mapa.');
    expect(t('challengeAi.result.retryMissed')).toBe('Refazer só os que errei');
    expect(t('challengeAi.result.groupLine', { label: 'Sepse', correct: 1, partial: 0, incorrect: 2 })).toBe('Sepse: 1 acertos, 0 parciais, 2 erros');
    expect(t('challengeAi.result.addedToReview', { n: 1 })).toBe('1 card entrou na revisão de hoje.');
    expect(t('challengeAi.preset.quick')).toBe('Revisão rápida');
    expect(t('challengeAi.rubric.save')).toBe('Salvar rubrica');
    expect(t('challengeAi.rubric.approved')).toBe('Rubrica aprovada. Ela não muda por aqui.');
  });

  it('interpolates cost', () => {
    expect(t('challengeAi.cost', { n: 5 })).toBe('Esta sessão usa 5 correções de IA');
  });
});
