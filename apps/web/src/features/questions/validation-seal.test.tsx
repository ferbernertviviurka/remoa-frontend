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

it('distinguishes the team declaration from medical review and Remoa authorship',()=>{
 render(<QuestionMeta question={{...q({kind:'remoa_team_attested',label:'Remoa',scope:'team_declaration'}),origin:'official_exam',sourceLabel:'Banca oficial',teamDisclosure:{kind:'remoa_team_attested',rightsStatus:'pending',medicalReview:false,explanationStatus:'absent',professionCode:'veterinary_medicine',flags:['key_conflict','image_missing','key_finality_unverified'],resolutionEligible:false,declarationDate:'2026-10-19'}}}/>);
 expect(screen.getByText('Validado pelo time da Remoa')).toBeInTheDocument();
 expect(screen.getByText('Fonte: Banca oficial')).toBeInTheDocument();
 expect(screen.getByText('Curso: Medicina Veterinária')).toBeInTheDocument();
 expect(screen.getByText('Fonte oficial. Direitos de uso ainda não verificados.')).toBeInTheDocument();
 expect(screen.getByText(/divergência entre os gabaritos/)).toBeInTheDocument();
 expect(screen.getByText(/imagem necessária está indisponível/)).toBeInTheDocument();
 expect(screen.getByText(/finalidade do gabarito não foi confirmada/)).toBeInTheDocument();
 expect(document.body.textContent).not.toMatch(/CRM|Revisada por médico|Autoral Remoa|Validado pela Remoa/);
});
