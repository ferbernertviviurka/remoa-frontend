import { afterEach,describe,expect,it,vi } from 'vitest';
import { cleanup,render,screen,fireEvent,waitFor } from '@testing-library/react';
import { questionReviewDetailSchema,questionSourceSchema } from '@remoa/contracts';
import { QuestionEditorialDetail } from './detail-screen';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock('@/features/admin/questions/api',()=>({editorialDetail:vi.fn(),medicalReview:vi.fn(),publicationAction:vi.fn(),rectifyQuestion:vi.fn(),saveQuestionDraft:vi.fn()}));
import { editorialDetail,medicalReview,publicationAction } from '@/features/admin/questions/api';
const id='550e8400-e29b-41d4-a716-446655440000';const hash='a'.repeat(64);
const question=questionReviewDetailSchema.parse({id,canonicalId:id,version:2,type:'objective',difficulty:'easy',stem:'Questão sintética não médica',alternatives:[{key:'A',text:'Sim'},{key:'B',text:'Não'}],correctKey:'A',explanation:'Explicação sintética',areaId:null,topicId:null,origin:'official_exam',sourceId:id,catalogStatus:'draft',rightsStatus:'authorized',availability:'active',integrityConfirmed:true,keyFinal:true,enamedConfirmed:true,contentHash:hash,reviewedHash:hash,reviewerName:null,reviewerCrm:null,referenceDate:null,assets:[]});
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe('clinical reviewer separation from administrative publication',()=>{
 it('admin sees publication but cannot self-sign medical approval; an old rejection does not open publish',async()=>{vi.mocked(editorialDetail).mockResolvedValue({question,source:null,latestReview:{decision:'rejected',contentHash:hash,reviewerName:'Revisor sintético',reviewerCrm:'CRM-TEST',referenceDate:'2026-01-01',reviewedAt:new Date()}});render(<QuestionEditorialDetail id={id} canAdmin canReview={false}/>);await screen.findAllByText('Questão sintética não médica');expect(screen.queryByRole('button',{name:'Assinar revisão'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Publicar questão'})).toBeDisabled();});
 it('reviewer must explicitly inspect the current hash and supply reason and temporal reference',async()=>{vi.mocked(editorialDetail).mockResolvedValue({question,source:null,latestReview:null});vi.mocked(medicalReview).mockRejectedValue(new Error('network'));render(<QuestionEditorialDetail id={id} canAdmin={false} canReview/>);await screen.findAllByText('Questão sintética não médica');const submit=screen.getByRole('button',{name:'Assinar revisão'});expect(submit).toBeDisabled();fireEvent.change(screen.getByLabelText('Marco temporal da referência'),{target:{value:'2026-01-01'}});fireEvent.change(screen.getByLabelText('Motivo desta operação'),{target:{value:'Conferência do conteúdo demonstrativo'}});expect(submit).toBeDisabled();fireEvent.click(screen.getByLabelText('Conferi conteúdo, explicação, fonte e marco temporal desta versão'));fireEvent.click(submit);await screen.findByText('Não conseguimos executar a operação. Tente novamente.');expect(medicalReview).toHaveBeenCalledWith(id,{decision:'changes_requested',contentHash:hash,referenceDate:'2026-01-01',reason:'Conferência do conteúdo demonstrativo'});expect(screen.queryByRole('button',{name:'Publicar questão'})).not.toBeInTheDocument();});
});

const reviewedQuestion={...question,catalogStatus:'approved' as const,availability:'annulled' as const,correctKey:null,areaId:id,topicId:id,reviewerName:'Revisor sintético',reviewerCrm:'12345-SP',referenceDate:'2026-01-01'};
const source=questionSourceSchema.parse({id,name:'Fonte autoral de teste',publisher:'Remoa teste',url:'https://example.com/synthetic',rightsStatus:'authorized',rightsEvidence:'Autorização sintética',rightsScope:'Uso de teste',rightsExpiresAt:null,accessedAt:new Date(),documentVersion:null,createdAt:new Date(),updatedAt:new Date()});
const latestReview={decision:'approved' as const,contentHash:hash,reviewerName:reviewedQuestion.reviewerName,reviewerCrm:reviewedQuestion.reviewerCrm,referenceDate:reviewedQuestion.referenceDate,reviewedAt:new Date()};
describe('annulled publication gates',()=>{
 it('returns focus to the focused publication opener after Escape',async()=>{
  vi.mocked(editorialDetail).mockResolvedValue({question:reviewedQuestion,source,latestReview});
  render(<QuestionEditorialDetail id={id} canAdmin canReview={false}/>);await screen.findByText('Sem gabarito');
  const publish=screen.getByRole('button',{name:'Publicar questão'});publish.focus();fireEvent.click(publish);
  const dialog=await screen.findByRole('dialog',{name:'Publicar questão'});expect(dialog).toContainElement(document.activeElement as HTMLElement);
  fireEvent.keyDown(dialog,{key:'Escape',code:'Escape'});await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(()=>expect(publish).toHaveFocus());expect(publicationAction).not.toHaveBeenCalled();
 });

 it('keeps an authorized reviewed active question publishable with its existing key',async()=>{
  vi.mocked(editorialDetail).mockResolvedValue({question:{...reviewedQuestion,availability:'active',correctKey:'A'},source,latestReview});
  render(<QuestionEditorialDetail id={id} canAdmin canReview={false}/>);await screen.findAllByText('Questão sintética não médica');
  expect(screen.getByRole('button',{name:'Publicar questão'})).toBeEnabled();
 });
 it.each(['absent','rejected','changedHash'] as const)('blocks %s latest medical review',async(kind)=>{
  const review=kind==='absent'?null:{...latestReview,decision:kind==='rejected'?'rejected' as const:latestReview.decision,contentHash:kind==='changedHash'?'b'.repeat(64):hash};
  vi.mocked(editorialDetail).mockResolvedValue({question:reviewedQuestion,source,latestReview:review});
  render(<QuestionEditorialDetail id={id} canAdmin canReview={false}/>);await screen.findAllByText('Questão sintética não médica');
  expect(screen.getByRole('button',{name:'Publicar questão'})).toBeDisabled();
 });

 it('publishes a reviewed authorized annulled question without inventing a key or score',async()=>{
  vi.mocked(editorialDetail).mockResolvedValue({question:reviewedQuestion,source,latestReview});
  render(<QuestionEditorialDetail id={id} canAdmin canReview={false}/>);
  await screen.findByText('Sem gabarito');
  const publish=screen.getByRole('button',{name:'Publicar questão'});expect(publish).toBeEnabled();fireEvent.click(publish);
  fireEvent.change(screen.getByLabelText('Motivo desta operação'),{target:{value:'Publicar anulada sintética como histórico revisado'}});
  const buttons=screen.getAllByRole('button',{name:'Publicar questão'});fireEvent.click(buttons[buttons.length-1]!);
  await waitFor(()=>expect(publicationAction).toHaveBeenCalledWith(id,'publish',{expectedContentHash:hash,revision:2,reason:'Publicar anulada sintética como histórico revisado'}));
  expect(reviewedQuestion.correctKey).toBeNull();
 });
 it.each([
  ['withdrawn',{catalogStatus:'withdrawn'}],['unavailable',{availability:'unavailable'}],['superseded',{availability:'superseded'}],
  ['question rights pending',{rightsStatus:'pending'}],['rights revoked',{rightsStatus:'revoked'}],['integrity missing',{integrityConfirmed:false}],['key conference missing',{keyFinal:false}],
  ['taxonomy conference missing',{enamedConfirmed:false}],['area missing',{areaId:null}],['topic missing',{topicId:null}],
  ['comment missing',{explanation:null}],['review signature changed',{reviewedHash:'b'.repeat(64)}],['reviewer missing',{reviewerName:null}],
  ['temporal reference missing',{referenceDate:null}],['active without key',{availability:'active',correctKey:null}],
 ] as const)('blocks %s even for an approved review',async(_name,patch)=>{
  vi.mocked(editorialDetail).mockResolvedValue({question:questionReviewDetailSchema.parse({...reviewedQuestion,...patch}),source,latestReview});
  render(<QuestionEditorialDetail id={id} canAdmin canReview={false}/>);await screen.findAllByText('Questão sintética não médica');
  expect(screen.getByRole('button',{name:'Publicar questão'})).toBeDisabled();expect(publicationAction).not.toHaveBeenCalled();
 });
 it.each(['missing','pending','expired'] as const)('blocks %s source authorization',async(kind)=>{
  const value=kind==='missing'?null:{...source,rightsStatus:kind==='pending'?'pending' as const:source.rightsStatus,rightsExpiresAt:kind==='expired'?new Date('2000-01-01'):null};
  vi.mocked(editorialDetail).mockResolvedValue({question:reviewedQuestion,source:value,latestReview});
  render(<QuestionEditorialDetail id={id} canAdmin canReview={false}/>);await screen.findAllByText('Questão sintética não médica');
  expect(screen.getByRole('button',{name:'Publicar questão'})).toBeDisabled();
 });
});
