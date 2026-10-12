import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import type {QuestionPublic} from '@remoa/contracts';
import {QuestionMeta} from './shared';
afterEach(cleanup);
const id='550e8400-e29b-41d4-a716-446655440000';
const q=(validation:QuestionPublic['validation'])=>({id,canonicalId:id,version:1,type:'objective',stem:'x',alternatives:null,origin:'remoa_authored',visibility:'public',availability:'active',difficulty:'easy',topicId:null,areaId:null,sourceId:null,sourceLabel:null,reviewed:true,validation,assets:[],boardId:null,cardIds:[],createdAt:new Date()}) as QuestionPublic;
describe('validation seal (D-1819)',()=>{
 it('shows Validado pela Remoa for institutional, with no CRM or medical review wording',()=>{
  render(<QuestionMeta question={q({kind:'remoa_institutional',label:'Remoa'})}/>);
  expect(screen.getByText('Validado pela Remoa')).toBeInTheDocument();expect(document.body.textContent).not.toMatch(/CRM|revis(ão|ada) m[ée]dic|Revisada/i);
 });
 it('keeps the reviewer name for medical review',()=>{
  render(<QuestionMeta question={q({kind:'medical_review',label:'Dra. Ana'})}/>);
  expect(screen.getByText(/Revisada · Dra. Ana/)).toBeInTheDocument();expect(screen.queryByText('Validado pela Remoa')).toBeNull();
 });
});
