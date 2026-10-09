import {describe,expect,it} from 'vitest';
import {adminActions} from '../../contracts/src/admin';
import {t} from './t-admin';
// Iterate the current shared protocol, so adding an action without a label fails here.
const actions=adminActions.filter(action=>action.startsWith('question.'));
describe('F33 question audit labels follow the shared action protocol',()=>{
 it('includes the catalogue and history actions',()=>{
  expect(actions).toContain('question.catalog_view');expect(actions).toContain('question.history_view');
 });
 it.each(actions)('resolves %s to a human label',action=>{
  const key=`admin.audit.actions.${action}` as const;
  const label=t(key);
  expect(typeof label).toBe('string');expect(label.trim().length).toBeGreaterThan(0);expect(label).not.toBe(key);expect(label).not.toContain('question.');expect(label).not.toMatch(/undefined|missing/i);
 });
});
