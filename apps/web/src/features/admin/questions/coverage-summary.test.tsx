import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {questionCatalogMetricsSchema} from '@remoa/contracts';
import {CoverageSummary} from './coverage-summary';
const id='550e8400-e29b-41d4-a716-446655440000';
const audit={id:1,createdAt:new Date(),actorType:'admin',actor:null,action:'question.import_view',targetType:null,targetId:null,targetLabel:null,reason:'Consultar composição sintética',result:'success',denial:null,before:null,after:null,ipHash:null,userAgent:null,requestId:null};
afterEach(cleanup);
describe('canonical public coverage',()=>{
 it('shows server origin and taxonomy counts independently from private generated quantities',()=>{
  const metrics=questionCatalogMetricsSchema.parse({publicCanonical:5,importsByStatus:[],candidateCounts:[],documents:2,generatedPrivate:99,duplicateOrVersionNotCounted:true,publicByOrigin:[{origin:'official_exam',count:5}],coverageByArea:[{areaId:id,name:'Área sintética',count:5}],coverageByTopic:[{topicId:id,name:'Assunto sintético',count:2}],coverageTruncated:true,audit});
  render(<CoverageSummary metrics={metrics}/>);expect(screen.getByText('Prova oficial')).toBeInTheDocument();expect(screen.getByText('Área sintética')).toBeInTheDocument();expect(screen.getByText('Assunto sintético')).toBeInTheDocument();expect(screen.getAllByText('5')).toHaveLength(2);expect(screen.getByText('2')).toBeInTheDocument();expect(screen.queryByText('99')).toBeNull();expect(screen.getByText(/até 500 áreas/)).toBeInTheDocument();
 });
});
