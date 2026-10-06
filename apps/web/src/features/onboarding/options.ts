import type { Goal, Segment } from '@remoa/contracts';
import type { StringKey } from '@remoa/strings';

/** Segment values -> existing account.stageOptions labels (earliest to latest). */
export const SEGMENTS: ReadonlyArray<{ id: Segment; label: StringKey }> = [
  { id: 'y1_2', label: 'account.profile.stageOptions.y12' },
  { id: 'y3_4', label: 'account.profile.stageOptions.y34' },
  { id: 'y5_6', label: 'account.profile.stageOptions.y56' },
  { id: 'graduated', label: 'account.profile.stageOptions.graduate' },
  { id: 'cursinho', label: 'account.profile.stageOptions.cursinho' },
  { id: 'resident', label: 'account.profile.stageOptions.resident' },
  { id: 'working', label: 'account.profile.stageOptions.working' },
  { id: 'not_med', label: 'account.profile.stageOptions.notMed' },
];

export const GOAL_GROUPS: ReadonlyArray<{ title: StringKey; goals: ReadonlyArray<{ id: Goal; label: StringKey }> }> = [
  {
    title: 'onboarding.goalGroups.enamed',
    goals: [
      { id: 'enamed_2027_1', label: 'account.profile.goalOptions.enamed20271' },
      { id: 'enamed_2027_2', label: 'account.profile.goalOptions.enamed20272' },
      { id: 'enamed_2028_1', label: 'account.profile.goalOptions.enamed20281' },
      { id: 'enamed_2028_2', label: 'account.profile.goalOptions.enamed20282' },
    ],
  },
  {
    title: 'onboarding.goalGroups.residencia',
    goals: [
      { id: 'residencia_enare', label: 'account.profile.goalOptions.enare' },
      { id: 'residencia_sus_sp', label: 'account.profile.goalOptions.susSp' },
      { id: 'residencia_usp', label: 'account.profile.goalOptions.usp' },
      { id: 'residencia_unifesp', label: 'account.profile.goalOptions.unifesp' },
      { id: 'residencia_outras', label: 'account.profile.goalOptions.outrasResidencias' },
    ],
  },
  {
    title: 'onboarding.goalGroups.outros',
    goals: [
      { id: 'provas_faculdade', label: 'account.profile.goalOptions.provasFaculdade' },
      { id: 'manter_atualizado', label: 'account.profile.goalOptions.manterAtualizado' },
      { id: 'undecided', label: 'account.profile.goalOptions.unknown' },
    ],
  },
];
