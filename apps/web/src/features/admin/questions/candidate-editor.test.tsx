import { afterEach,describe,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import { questionCandidateSchema } from '@remoa/contracts';
import { CandidateEditor } from './candidate-editor';
import { QuestionsApiError } from '@/features/questions/api';
vi.mock('./api',()=>({saveCandidate:vi.fn()}));
vi.mock('./private-preview',()=>({PrivatePreview:()=>null}));
vi.mock('@/features/questions/api',async original=>({...await original<typeof import('@/features/questions/api')>(),listQuestionTaxonomy:vi.fn(async()=>[])}));
import { saveCandidate } from './api';
const save=vi.mocked(saveCandidate);
const id='550e8400-e29b-41d4-a716-446655440000';
function fixture(images=false){return questionCandidateSchema.parse({id,importId:id,chunkId:null,ordinal:1,originalNumber:'1',payload:{stem:'Enunciado sintético não médico',alternatives:[{key:'A',text:'Primeira alternativa'},{key:'B',text:'Segunda alternativa'}],correctKey:'A',annulled:false,areaId:id,topicId:id,imageRefs:images?[{page:1,bbox:{x:1,y:2,width:3,height:4},method:'text',objectKey:'private/demo',provenance:{documentId:id,page:1,bbox:[0,0,.1,.1]}}]:[]},confidence:{},provenance:[],issues:['ambiguous_key'],fingerprint:null,duplicateOf:null,questionId:null,state:'needs_review',revision:3,createdAt:new Date(),updatedAt:new Date()});}
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe('candidate visual confirmation and concurrency',()=>{
 it('preserves local content and blocks a known stale candidate until explicit reload',()=>{const candidate=fixture();const view=render(<CandidateEditor candidate={candidate} importId={id} onSaved={vi.fn()}/>);fireEvent.change(screen.getByLabelText('Enunciado'),{target:{value:'Rascunho local preservado'}});fireEvent.change(screen.getByLabelText('Motivo desta operação'),{target:{value:'Motivo local preservado'}});view.rerender(<CandidateEditor candidate={{...candidate,revision:4,payload:{...candidate.payload,stem:'Outro conteúdo no servidor'}}} importId={id} onSaved={vi.fn()}/>);expect(screen.getByLabelText('Enunciado')).toHaveValue('Rascunho local preservado');expect(screen.getByLabelText('Motivo desta operação')).toHaveValue('Motivo local preservado');expect(screen.getByText(/Esta candidata foi alterada/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Salvar conferência'})).toBeDisabled();expect(save).not.toHaveBeenCalled();});
 it('edits only ownStem of a bound context and submits the import revision without duplicating the prefix',async()=>{const commit=vi.fn();const candidate=fixture();const context={...candidate,payload:{...candidate.payload,stem:'Contexto comum. Pergunta própria.',ownStem:'Pergunta própria.',contextBindings:[{contextId:id,contextRevision:2,resolutionHash:'a'.repeat(64)}]}};render(<CandidateEditor candidate={context} importId={id} importRevision={7} onSaved={vi.fn()} onSaveContent={commit}/>);expect(screen.getByText('Contexto comum. Pergunta própria.')).toBeInTheDocument();fireEvent.change(screen.getByLabelText('Trecho próprio desta questão'),{target:{value:'Pergunta própria conferida.'}});fireEvent.change(screen.getByLabelText('Motivo desta operação'),{target:{value:'Conferência sintética do trecho'}});fireEvent.click(screen.getByRole('button',{name:'Salvar conferência'}));await waitFor(()=>expect(commit).toHaveBeenCalledWith(expect.objectContaining({stem:'Contexto comum. Pergunta própria.',ownStem:'Pergunta própria conferida.',importRevision:7,keyFinal:false,integrityConfirmed:false})));});
 it('blocks acceptance while unresolved shared context exists even after individual confirmations',()=>{const base=alphabetFixture();render(<CandidateEditor candidate={{...base,state:'accepted',payload:{...base.payload,imagesConfirmed:true}}} importId={id} acceptanceBlocked onSaved={vi.fn()}/>);fireEvent.change(screen.getByLabelText('Motivo desta operação'),{target:{value:'Conferência sintética do lote'}});expect(screen.getByRole('button',{name:'Salvar conferência'})).toBeDisabled();expect(screen.getByText(/Há contexto comum sem resolução/)).toBeInTheDocument();});

 it('does not accept an image without explicit visual check and accessible description',async()=>{render(<CandidateEditor candidate={{...fixture(true),state:'accepted'}} importId={id} onSaved={vi.fn()}/>);expect(screen.getByText(/ambiguidade visual/)).toBeInTheDocument();fireEvent.change(screen.getByLabelText('Motivo desta operação'),{target:{value:'Comparação visual conferida'}});for(const name of ['Conferi o gabarito definitivo e sua versão','Conferi enunciado, alternativas, numeração e origem','Conferi figuras e tabelas no documento original'])fireEvent.click(screen.getByLabelText(name));expect(screen.getByRole('button',{name:'Salvar conferência'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Descrição acessível da figura 1'),{target:{value:'Figura sintética mostrando dois círculos'}});expect(screen.getByRole('button',{name:'Salvar conferência'})).toBeEnabled();});
 it('preserves multiple draft fields when a same-revision response arrives',()=>{const candidate=fixture();const view=render(<CandidateEditor candidate={candidate} importId={id} onSaved={vi.fn()}/>);fireEvent.change(screen.getByLabelText('Comentário autoral'),{target:{value:'Comentário sintético preenchido'}});for(const name of ['Conferi o gabarito definitivo e sua versão','Conferi enunciado, alternativas, numeração e origem','Conferi figuras e tabelas no documento original'])fireEvent.click(screen.getByLabelText(name));view.rerender(<CandidateEditor candidate={{...candidate,payload:{...candidate.payload}}} importId={id} onSaved={vi.fn()}/>);expect(screen.getByLabelText('Comentário autoral')).toHaveValue('Comentário sintético preenchido');for(const name of ['Conferi o gabarito definitivo e sua versão','Conferi enunciado, alternativas, numeração e origem','Conferi figuras e tabelas no documento original'])expect(screen.getByLabelText(name)).toBeChecked();});
 it('incorporates an attached page revision while preserving the local draft and requiring another visual check',async()=>{
  const original={...fixture(),provenance:[{documentId:id,page:1,bbox:[0,0,1,1] as [number,number,number,number]}]};
  const ref={...fixture(true).payload.imageRefs[0]!,method:'manual_page' as const};
  const updated={...original,revision:4,payload:{...original.payload,imageRefs:[ref],imagesConfirmed:false}};
  const attach=vi.fn().mockResolvedValue(updated);
  save.mockResolvedValue({candidate:{...updated,revision:5},questionId:null,importRevision:0,affectedCandidates:[],audit:{id:1,createdAt:new Date(),actorType:'admin',actor:null,action:'question.candidate_update',targetType:null,targetId:id,targetLabel:null,reason:'Conferência sintética',result:'success',denial:null,before:null,after:null,ipHash:null,userAgent:null,requestId:null}});
  render(<CandidateEditor candidate={original} importId={id} onSaved={vi.fn()} onAttachPage={attach}/>);
  fireEvent.change(screen.getByLabelText('Enunciado'),{target:{value:'Redação local preservada'}});
  fireEvent.change(screen.getByLabelText('Comentário autoral'),{target:{value:'Comentário local preservado'}});
  fireEvent.change(screen.getByLabelText('Motivo desta operação'),{target:{value:'Revisão local preservada'}});
  fireEvent.click(screen.getByLabelText('Conferi figuras e tabelas no documento original'));
  fireEvent.click(screen.getByRole('button',{name:'Adicionar imagem desta página'}));
  const dialog=within(screen.getByRole('dialog'));
  expect(dialog.getByRole('button',{name:'Associar página à candidata'})).toBeDisabled();
  fireEvent.change(dialog.getByLabelText('Descrição acessível da imagem'),{target:{value:'Figura sintética de dois círculos'}});
  fireEvent.change(dialog.getByLabelText('Motivo desta operação'),{target:{value:'Associar figura vista na prova'}});
  fireEvent.click(dialog.getByRole('button',{name:'Associar página à candidata'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(attach).toHaveBeenCalledWith(1,3,'Associar figura vista na prova',0);
  expect(screen.getByLabelText('Enunciado')).toHaveValue('Redação local preservada');
  expect(screen.getByLabelText('Comentário autoral')).toHaveValue('Comentário local preservado');
  expect(screen.getByLabelText('Motivo desta operação')).toHaveValue('Revisão local preservada');
  expect(screen.getByLabelText('Conferi figuras e tabelas no documento original')).not.toBeChecked();
  expect(screen.getByLabelText('Descrição acessível da figura 1')).toHaveValue('Figura sintética de dois círculos');
  expect(screen.getByText('Página 1')).toBeInTheDocument();
  expect(screen.queryByText(/Região: x/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Salvar conferência'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith(id,id,expect.objectContaining({revision:4,stem:'Redação local preservada',explanation:'Comentário local preservado',imagesConfirmed:false,reason:'Revisão local preservada',assets:[expect.objectContaining({alt:'Figura sintética de dois círculos'})]})));
 });
 it('keeps the local content and image form after a page association conflict',async()=>{
  const candidate={...fixture(),provenance:[{documentId:id,page:1,bbox:[0,0,1,1] as [number,number,number,number]}]};
  const attach=vi.fn().mockRejectedValue(new QuestionsApiError('conflict'));
  render(<CandidateEditor candidate={candidate} importId={id} onSaved={vi.fn()} onAttachPage={attach}/>);
  fireEvent.change(screen.getByLabelText('Enunciado'),{target:{value:'Edição local ainda não salva'}});
  fireEvent.click(screen.getByRole('button',{name:'Adicionar imagem desta página'}));
  const dialog=within(screen.getByRole('dialog'));
  fireEvent.change(dialog.getByLabelText('Descrição acessível da imagem'),{target:{value:'Descrição local da figura'}});
  fireEvent.change(dialog.getByLabelText('Motivo desta operação'),{target:{value:'Associar figura após comparar'}});
  fireEvent.click(dialog.getByRole('button',{name:'Associar página à candidata'}));
  await dialog.findByText('Este conteúdo mudou. Atualize e confira novamente antes de continuar.');
  expect(dialog.getByLabelText('Descrição acessível da imagem')).toHaveValue('Descrição local da figura');
  expect(dialog.getByLabelText('Motivo desta operação')).toHaveValue('Associar figura após comparar');
  expect(screen.getByLabelText('Enunciado')).toHaveValue('Edição local ainda não salva');
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByText('Revisão 3')).toBeInTheDocument();
 });
 it('sends the read revision and keeps the unsaved edits after a hash conflict',async()=>{save.mockRejectedValue(new QuestionsApiError('conflict'));const done=vi.fn();const candidate=fixture();render(<CandidateEditor candidate={candidate} importId={id} onSaved={done}/>);fireEvent.change(screen.getByLabelText('Enunciado'),{target:{value:'Nova redação sintética'}});fireEvent.change(screen.getByLabelText('Motivo desta operação'),{target:{value:'Corrigir redação após comparação'}});fireEvent.click(screen.getByRole('button',{name:'Salvar conferência'}));await screen.findByText('Este conteúdo mudou. Atualize e confira novamente antes de continuar.');expect(done).not.toHaveBeenCalled();expect(screen.getByLabelText('Enunciado')).toHaveValue('Nova redação sintética');await waitFor(()=>expect(save).toHaveBeenCalledWith(id,id,expect.objectContaining({revision:3,stem:'Nova redação sintética',state:'needs_review'})));expect(save.mock.calls[0]?.[2]).not.toHaveProperty('imageRefs');});
});

function alphabetFixture(){const candidate=fixture();return {...candidate,payload:{...candidate.payload,correctKey:'B',keyFinal:true,integrityConfirmed:true,alternatives:[{key:'A',text:'Primeiro significado'},{key:'B',text:'Significado correto B'},{key:'C',text:'Terceiro significado'}]}};}
describe('alternative keys preserve the answer meaning',()=>{
 it('requires another key and integrity confirmation after editing the stem without changing the selected answer',async()=>{
  const commit=vi.fn();const base=alphabetFixture();render(<CandidateEditor candidate={{...base,state:'accepted',payload:{...base.payload,imagesConfirmed:true}}} importId={id} onSaved={vi.fn()} onSaveContent={commit}/>);
  fireEvent.change(screen.getByLabelText('Motivo desta operação'),{target:{value:'Conferir contexto no documento original'}});
  const submit=screen.getByRole('button',{name:'Salvar conferência'});expect(submit).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Enunciado'),{target:{value:'Enunciado sintético com contexto conferido'}});
  expect(screen.getByRole('combobox',{name:'Gabarito'})).toHaveTextContent('B');
  expect(screen.getByLabelText('Conferi o gabarito definitivo e sua versão')).not.toBeChecked();
  expect(screen.getByLabelText('Conferi enunciado, alternativas, numeração e origem')).not.toBeChecked();
  expect(screen.getByLabelText('Conferi figuras e tabelas no documento original')).toBeChecked();
  expect(submit).toBeDisabled();expect(commit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('Conferi o gabarito definitivo e sua versão'));expect(submit).toBeDisabled();
  fireEvent.click(screen.getByLabelText('Conferi enunciado, alternativas, numeração e origem'));expect(submit).toBeEnabled();
  fireEvent.click(submit);await waitFor(()=>expect(commit).toHaveBeenCalledWith(expect.objectContaining({stem:'Enunciado sintético com contexto conferido',correctKey:'B',keyFinal:true,integrityConfirmed:true,imagesConfirmed:true,state:'accepted',revision:3})));
 });

 it('saves an incomplete needs-review draft after its correct alternative is removed',async()=>{
  const commit=vi.fn();render(<CandidateEditor candidate={alphabetFixture()} importId={id} onSaved={vi.fn()} onSaveContent={commit}/>);
  fireEvent.click(screen.getByRole('button',{name:'Remover alternativa B'}));
  fireEvent.change(screen.getByLabelText('Motivo desta operação'),{target:{value:'Revisar gabarito que precisa de conferência'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar conferência'}));
  await waitFor(()=>expect(commit).toHaveBeenCalledWith(expect.objectContaining({state:'needs_review',correctKey:null,keyFinal:false,integrityConfirmed:false,alternatives:[{key:'A',text:'Primeiro significado'},{key:'C',text:'Terceiro significado'}]})));
 });
 it('removes A without transferring the correct B meaning to the old C',async()=>{
  const commit=vi.fn();render(<CandidateEditor candidate={alphabetFixture()} importId={id} onSaved={vi.fn()} onSaveContent={commit}/>);
  fireEvent.click(screen.getByRole('button',{name:'Remover alternativa A'}));
  expect(screen.queryByLabelText('Alternativa A')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Alternativa B')).toHaveValue('Significado correto B');
  expect(screen.getByLabelText('Alternativa C')).toHaveValue('Terceiro significado');
  expect(screen.getByRole('combobox',{name:'Gabarito'})).toHaveTextContent('B');
  expect(screen.getByLabelText('Conferi o gabarito definitivo e sua versão')).not.toBeChecked();
  expect(screen.getByLabelText('Conferi enunciado, alternativas, numeração e origem')).not.toBeChecked();
  fireEvent.change(screen.getByLabelText('Motivo desta operação'),{target:{value:'Remover opção após comparação'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar conferência'}));
  await waitFor(()=>expect(commit).toHaveBeenCalledWith(expect.objectContaining({correctKey:'B',alternatives:[{key:'B',text:'Significado correto B'},{key:'C',text:'Terceiro significado'}],keyFinal:false,integrityConfirmed:false})));
 });
 it('clears a removed correct key and keeps acceptance blocked even after checks are reticked',()=>{
  const candidate=alphabetFixture();render(<CandidateEditor candidate={{...candidate,state:'accepted',payload:{...candidate.payload,imagesConfirmed:true}}} importId={id} onSaved={vi.fn()}/>);
  fireEvent.change(screen.getByLabelText('Motivo desta operação'),{target:{value:'Remover resposta que saiu da prova'}});
  fireEvent.click(screen.getByRole('button',{name:'Remover alternativa B'}));
  expect(screen.getByRole('combobox',{name:'Gabarito'})).toHaveTextContent('Sem gabarito');
  expect(screen.getByLabelText('Alternativa C')).toHaveValue('Terceiro significado');
  for(const name of ['Conferi o gabarito definitivo e sua versão','Conferi enunciado, alternativas, numeração e origem']){expect(screen.getByLabelText(name)).not.toBeChecked();fireEvent.click(screen.getByLabelText(name));}
  expect(screen.getByRole('button',{name:'Salvar conferência'})).toBeDisabled();
  expect(save).not.toHaveBeenCalled();
 });
 it('adds the first unused letter and text edits require another confirmation',()=>{
  render(<CandidateEditor candidate={alphabetFixture()} importId={id} onSaved={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Remover alternativa A'}));
  fireEvent.click(screen.getByRole('button',{name:'Adicionar alternativa'}));
  fireEvent.click(screen.getByRole('button',{name:'Adicionar alternativa'}));
  expect(screen.getByLabelText('Alternativa A')).toHaveValue('');
  expect(screen.getByLabelText('Alternativa D')).toHaveValue('');
  expect(screen.getAllByLabelText('Alternativa B')).toHaveLength(1);
  expect(screen.getByLabelText('Alternativa B')).toHaveValue('Significado correto B');
  for(const name of ['Conferi o gabarito definitivo e sua versão','Conferi enunciado, alternativas, numeração e origem'])fireEvent.click(screen.getByLabelText(name));
  fireEvent.change(screen.getByLabelText('Alternativa B'),{target:{value:'Significado B revisado'}});
  expect(screen.getByRole('combobox',{name:'Gabarito'})).toHaveTextContent('B');
  for(const name of ['Conferi o gabarito definitivo e sua versão','Conferi enunciado, alternativas, numeração e origem'])expect(screen.getByLabelText(name)).not.toBeChecked();
 });
});
