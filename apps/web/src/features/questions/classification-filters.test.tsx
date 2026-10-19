import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import type {QuestionClassificationCatalog} from '@remoa/contracts';
import {ClassificationFilters} from './classification-filters';
import {ClassificationMeta} from './classification-meta';
vi.mock('./classification-api',()=>({listClassification:vi.fn()}));
import {listClassification} from './classification-api';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const catalog:QuestionClassificationCatalog={course:'nursing',total:100,unclassifiedArea:90,unclassifiedTopic:90,areas:[{id:id(1),name:'Área automática',count:10,classificationKind:'automatic_unreviewed',topics:[{id:id(2),name:'Assunto automático',count:10}]},{id:id(3),name:'Outra área',count:2,classificationKind:'automatic_unreviewed',topics:[{id:id(4),name:'Outro assunto',count:2}]}]};
beforeEach(()=>vi.mocked(listClassification).mockReset().mockResolvedValue(catalog));afterEach(cleanup);
it('requires an explicit course and never falls back to global ENAMED taxonomy',()=>{render(<ClassificationFilters course={null} value={{areaIds:[],topicIds:[]}} onChange={vi.fn()}/>);expect(screen.getByText(/Escolha um curso/)).toBeVisible();expect(listClassification).not.toHaveBeenCalled();});
it('limits topics to chosen parent areas and discloses automatic counts before choosing',async()=>{
 const onChange=vi.fn();render(<ClassificationFilters course="nursing" value={{areaIds:[id(1)],topicIds:[id(2)]}} onChange={onChange}/>);
 const area=await screen.findByRole('combobox',{name:'Áreas do curso'});fireEvent.focus(area);
 expect(await screen.findByRole('option',{name:'Outra área · aptas: 2 · automática, não revisada'})).toBeVisible();
 fireEvent.click(screen.getByRole('option',{name:'Área automática · aptas: 10 · automática, não revisada'}));
 expect(onChange).toHaveBeenLastCalledWith({areaIds:[],topicIds:[],classificationStatus:undefined});
 const topic=screen.getByRole('combobox',{name:'Assuntos das áreas escolhidas'});fireEvent.focus(topic);
 expect(await screen.findByRole('option',{name:'Assunto automático · aptas: 10 · automática, não revisada'})).toBeVisible();
 expect(screen.queryByRole('option',{name:/Outro assunto/})).toBeNull();
});
it('unclassified means missing either field and clears selected UUID filters explicitly',async()=>{
 const onChange=vi.fn();render(<ClassificationFilters course="nursing" value={{areaIds:[id(1)],topicIds:[id(2)]}} onChange={onChange}/>);
 fireEvent.click(await screen.findByRole('checkbox',{name:'Não classificadas'}));
 expect(onChange).toHaveBeenLastCalledWith({areaIds:[],topicIds:[],classificationStatus:'unclassified'});
 expect(screen.getByText(/Sem área ou assunto definido/)).toBeVisible();
 expect(screen.getByText(/Uma questão pode estar nos dois grupos/)).toBeVisible();
});
it('preserves genuine classification errors as errors with retry, not empty taxonomy',async()=>{
 vi.mocked(listClassification).mockRejectedValueOnce(new Error('500'));
 render(<ClassificationFilters course="nursing" value={{areaIds:[],topicIds:[]}} onChange={vi.fn()}/>);
 await screen.findByRole('alert');expect(screen.queryByText(/Ainda não há áreas ou assuntos classificados/)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'}));await screen.findByRole('combobox',{name:'Áreas do curso'});expect(listClassification).toHaveBeenCalledTimes(2);
});
it('ignores a stale course response after the user changes course',async()=>{
 let resolve!:(value:QuestionClassificationCatalog)=>void;vi.mocked(listClassification).mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValueOnce({...catalog,course:'pharmacy',areas:[]});
 const {rerender}=render(<ClassificationFilters course="nursing" value={{areaIds:[],topicIds:[]}} onChange={vi.fn()}/>);
 rerender(<ClassificationFilters course="pharmacy" value={{areaIds:[],topicIds:[]}} onChange={vi.fn()}/>);
 await screen.findByText(/Ainda não há áreas ou assuntos classificados/);resolve(catalog);
 await waitFor(()=>expect(screen.queryByText('Área automática')).toBeNull());
});
it('shows effective labels and automatic warning without claiming ENAMED or human review',()=>{
 render(<ClassificationMeta classification={{kind:'automatic_unreviewed',course:'nursing',area:{id:id(1),label:'Área sugerida'},topic:{id:id(2),label:'Assunto sugerido'}}}/>);
 expect(screen.getByText('Classificação automática, ainda não revisada')).toBeVisible();expect(screen.getByText('Área: Área sugerida')).toBeVisible();expect(screen.getByText('Assunto: Assunto sugerido')).toBeVisible();expect(screen.queryByText('Taxonomia ENAMED')).toBeNull();
});

it('refreshes an earlier empty classification index after activation without caching it forever',async()=>{
 vi.mocked(listClassification).mockResolvedValueOnce({...catalog,areas:[]}).mockResolvedValueOnce(catalog);
 render(<ClassificationFilters course="nursing" value={{areaIds:[],topicIds:[]}} onChange={vi.fn()}/>);
 await screen.findByText(/Ainda não há áreas ou assuntos classificados/);fireEvent.click(screen.getByRole('button',{name:'Atualizar áreas e assuntos'}));
 const field=await screen.findByRole('combobox',{name:'Áreas do curso'});fireEvent.focus(field);expect(await screen.findByRole('option',{name:/Área automática · aptas: 10/})).toBeVisible();expect(listClassification).toHaveBeenCalledTimes(2);
});
