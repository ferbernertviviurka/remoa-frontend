import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {mockQuestionAdminCatalogPage,mockQuestionInstitutionalApproveResult} from '@remoa/contracts/mocks';
import {QuestionsApiError} from '@/features/questions/request';
import {InstitutionalApproveDialog} from './institutional-approve-dialog';
vi.mock('./operations-api',()=>({approveInstitutionally:vi.fn()}));vi.mock('./api',()=>({listSources:vi.fn()}));
import {approveInstitutionally} from './operations-api';
const item=mockQuestionAdminCatalogPage.items[0]!;
const fill=()=>{fireEvent.change(screen.getByLabelText(/Nome da founder/),{target:{value:'Dra. Fundadora'}});fireEvent.change(screen.getByLabelText(/Motivo/),{target:{value:'Lote autoral aprovado'}});};
const accept=()=>fireEvent.click(screen.getByRole('checkbox'));
const submit=()=>screen.getByRole('button',{name:/Validar e publicar|Tentar de novo/});
beforeEach(()=>vi.resetAllMocks());afterEach(cleanup);
describe('institutional approval dialog (D-1819)',()=>{
 it('blocks submit without name, reason or the required checkbox, and refuses digits (CRM)',()=>{
  render(<InstitutionalApproveDialog items={[item]} onClose={vi.fn()} onDone={vi.fn()}/>);
  expect(submit()).toBeDisabled();fill();expect(submit()).toBeDisabled();accept();expect(submit()).toBeEnabled();
  fireEvent.change(screen.getByLabelText(/Nome da founder/),{target:{value:'Dra. X CRM 123'}});expect(submit()).toBeDisabled();
  expect(screen.getByText('Founder médica')).toBeInTheDocument();expect(screen.getByText('Conteúdo próprio da Remoa')).toBeInTheDocument();
  expect(approveInstitutionally).not.toHaveBeenCalled();
 });
 it('sends the attestation, reuses the key on network retry and renders every outcome with the hash hint',async()=>{
  vi.mocked(approveInstitutionally).mockRejectedValueOnce(new QuestionsApiError('internal')).mockResolvedValueOnce(mockQuestionInstitutionalApproveResult);
  const onDone=vi.fn();render(<InstitutionalApproveDialog items={[item]} onClose={vi.fn()} onDone={onDone}/>);fill();accept();fireEvent.click(submit());
  await screen.findByRole('alert');fireEvent.click(submit());
  await screen.findByText('Resultado por questão');
  const [a,b]=vi.mocked(approveInstitutionally).mock.calls.map(c=>c[0]);
  expect(a!.idempotencyKey).toBe(b!.idempotencyKey);expect(b!.attestation).toEqual({approverRole:'medical_founder',approverName:'Dra. Fundadora',rightsBasis:'remoa_owned',acceptsUnconfirmedChecks:true});
  expect(screen.getByText('Publicada com o selo Validado pela Remoa.')).toBeInTheDocument();
  expect(screen.getByText(/Sem gabarito válido/)).toBeInTheDocument();
  expect(screen.getAllByText(/Preparar para edição/).length).toBeGreaterThan(0);
  expect(screen.getByText('1 publicadas, 0 já publicadas, 2 com pendência.')).toBeInTheDocument();
 });
 it('uses a new key when the payload changes after a failure',async()=>{
  vi.mocked(approveInstitutionally).mockRejectedValue(new QuestionsApiError('internal'));
  render(<InstitutionalApproveDialog items={[item]} onClose={vi.fn()} onDone={vi.fn()}/>);fill();accept();fireEvent.click(submit());await screen.findByRole('alert');
  fireEvent.change(screen.getByLabelText(/Motivo/),{target:{value:'Outro motivo válido'}});fireEvent.click(submit());await waitFor(()=>expect(approveInstitutionally).toHaveBeenCalledTimes(2));
  const [a,b]=vi.mocked(approveInstitutionally).mock.calls.map(c=>c[0]);expect(a!.idempotencyKey).not.toBe(b!.idempotencyKey);
 });
 it('does not send items without hash and says so',()=>{
  render(<InstitutionalApproveDialog items={[{...item,contentHash:null}]} onClose={vi.fn()} onDone={vi.fn()}/>);
  expect(screen.getByText(/não têm hash/)).toBeInTheDocument();fill();accept();expect(submit()).toBeDisabled();
 });
});
