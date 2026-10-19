import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {questionCatalogMetricsSchema} from '@remoa/contracts';
import {CoverageSummary} from './coverage-summary';
const id='550e8400-e29b-41d4-a716-446655440000';
const audit={id:1,createdAt:new Date(),actorType:'admin',actor:null,action:'question.import_view',targetType:null,targetId:null,targetLabel:null,reason:'Consultar composição sintética',result:'success',denial:null,before:null,after:null,ipHash:null,userAgent:null,requestId:null};
afterEach(cleanup);
const base={publicCanonical:28214,importsByStatus:[],candidateCounts:[],documents:841,generatedPrivate:99,duplicateOrVersionNotCounted:true,audit};
describe('canonical public coverage',()=>{
 it('shows server origin and taxonomy counts independently from private generated quantities',()=>{
  const metrics=questionCatalogMetricsSchema.parse({publicCanonical:5,importsByStatus:[],candidateCounts:[],documents:2,generatedPrivate:99,duplicateOrVersionNotCounted:true,publicByOrigin:[{origin:'official_exam',count:5}],coverageByArea:[{areaId:id,name:'Área sintética',count:5}],coverageByTopic:[{topicId:id,name:'Assunto sintético',count:2}],coverageTruncated:true,audit});
  render(<CoverageSummary metrics={metrics}/>);expect(screen.getByText('Prova oficial')).toBeInTheDocument();expect(screen.getByText('Área sintética')).toBeInTheDocument();expect(screen.getByText('Assunto sintético')).toBeInTheDocument();expect(screen.getAllByText('5')).toHaveLength(2);expect(screen.getByText('2')).toBeInTheDocument();expect(screen.queryByText('99')).toBeNull();expect(screen.getByText(/até 500 áreas/)).toBeInTheDocument();expect(screen.getByText(/ainda não estão disponíveis nesta versão da API/)).toBeInTheDocument();
 });
 it('shows all eligible courses and classification gaps while keeping overlapping source tags separate',()=>{
  const byCourse=[{course:'biomedicine',count:704},{course:'dentistry',count:1456},{course:'medicine',count:17760},{course:'nursing',count:1568},{course:'nutrition',count:940},{course:'pharmacy',count:1248},{course:'physical_education',count:312},{course:'physiotherapy',count:750},{course:'psychology',count:846},{course:'veterinary_medicine',count:1925}];
  const metrics=questionCatalogMetricsSchema.parse({...base,acervoCoverage:{eligibleTotal:27509,byCourse,unclassifiedArea:27000,unclassifiedTopic:27509,sourceAreaTags:[{code:'clinica-medica',count:20000},{code:'cirurgia',count:20000}],sourceAreaTagsUnreviewed:true}});
  render(<CoverageSummary metrics={metrics}/>);
  expect(screen.getAllByText('27.509')).toHaveLength(2);
  expect(screen.getByText('10 cursos com questões aptas')).toBeInTheDocument();
  for(const name of ['Biomedicina','Odontologia','Medicina','Enfermagem','Nutrição','Farmácia','Educação Física','Fisioterapia','Psicologia','Medicina Veterinária'])expect(screen.getByText(name)).toBeInTheDocument();
  const area=screen.getByText('Área ainda não classificada').parentElement!;
  expect(within(area).getByText('27.000')).toBeInTheDocument();
  expect(screen.getByText('Assunto ainda não classificado')).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Áreas de origem — não revisadas'})).toBeInTheDocument();
  expect(screen.getByText(/não some estas contagens/)).toBeInTheDocument();
  expect(screen.getAllByText('20.000')).toHaveLength(2);
  expect(screen.queryByText('40.000')).toBeNull();expect(screen.queryByText('99')).toBeNull();
 });
 it('reports an actual zero explicitly without inventing courses or source tags',()=>{
  render(<CoverageSummary metrics={questionCatalogMetricsSchema.parse({...base,publicCanonical:0,acervoCoverage:{eligibleTotal:0,byCourse:[],unclassifiedArea:0,unclassifiedTopic:0,sourceAreaTags:[],sourceAreaTagsUnreviewed:true}})}/>);
  expect(screen.getByText('0 cursos com questões aptas')).toBeInTheDocument();
  expect(screen.getByText('Ainda não há questões aptas para treino ou simulado.')).toBeInTheDocument();
  expect(screen.getByText('Nenhuma tag documental de área nesta leitura.')).toBeInTheDocument();
  expect(screen.queryByText(/ainda não estão disponíveis nesta versão da API/)).toBeNull();
 });
});
