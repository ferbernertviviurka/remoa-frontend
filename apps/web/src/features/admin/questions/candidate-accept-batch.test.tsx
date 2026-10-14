import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import type {QuestionCandidate} from '@remoa/contracts';
import {CandidateAcceptBatch} from './candidate-accept-batch';
vi.mock('./api',()=>({acceptCandidates:vi.fn()}));
import {acceptCandidates} from './api';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const cand=(n:number,state:QuestionCandidate['state'])=>({id:id(n),state,revision:n,ordinal:n} as QuestionCandidate);
const candidates=[cand(1,'needs_review'),cand(2,'pending'),cand(3,'accepted')];
const label=(c:QuestionCandidate)=>`Questão ${c.ordinal}`;
const audit={id:1,createdAt:new Date('2026-10-13T00:00:00Z'),actorType:'admin',actor:null,action:'question.candidate_update',targetType:'question_import',targetId:id(0),targetLabel:null,reason:'Conferi a prova',result:'success',denial:null,before:null,after:null,ipHash:null,userAgent:null,requestId:null} as never;
beforeEach(()=>vi.resetAllMocks());afterEach(cleanup);
describe('batch accept (D-1841)',()=>{
 it('selects all pending, requires reason + attestation, sends one call and lists every outcome',async()=>{
  vi.mocked(acceptCandidates).mockResolvedValue({results:[{id:id(1),outcome:'accepted',questionId:id(9)},{id:id(2),outcome:'taxonomy_missing',questionId:null}],importRevision:6,audit});
  const onDone=vi.fn();render(<CandidateAcceptBatch importId={id(0)} importRevision={5} candidates={candidates} blocked={false} label={label} onDone={onDone}/>);
  expect(screen.queryByLabelText('Selecionar Questão 3')).toBeNull();
  const action=screen.getByRole('button',{name:'Aceitar selecionadas'});expect(action).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Selecionar todas (2)'}));expect(action).toBeEnabled();fireEvent.click(action);
  const dialog=screen.getByRole('dialog');const confirm=within(dialog).getByRole('button',{name:'Aceitar 2 candidatas'});expect(confirm).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText(/Motivo/),{target:{value:'Conferi a prova inteira'}});expect(confirm).toBeDisabled();
  fireEvent.click(within(dialog).getByRole('checkbox'));expect(confirm).toBeEnabled();fireEvent.click(confirm);
  await screen.findByText('Resultado por candidata');
  expect(acceptCandidates).toHaveBeenCalledTimes(1);
  expect(vi.mocked(acceptCandidates).mock.calls[0]).toEqual([id(0),{importRevision:5,items:[{id:id(1),revision:1},{id:id(2),revision:2}],confirmsChecks:true,reason:'Conferi a prova inteira'}]);
  expect(screen.getByText('1 aceitas, 1 não aceitas.')).toBeInTheDocument();expect(screen.getByText(/Sem área ou assunto/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Concluir'}));expect(onDone).toHaveBeenCalledTimes(1);
 });
 it('disables accept while a shared context blocks acceptance',()=>{
  render(<CandidateAcceptBatch importId={id(0)} importRevision={5} candidates={candidates} blocked label={label} onDone={vi.fn()}/>);
  fireEvent.click(screen.getByLabelText('Selecionar Questão 1'));
  expect(screen.getByRole('button',{name:'Aceitar selecionadas'})).toBeDisabled();
 });
});
