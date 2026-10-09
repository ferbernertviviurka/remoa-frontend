import {QuestionReportDetail} from '@/features/editorial/questions/reports-screen';
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <QuestionReportDetail id={id} admin={false}/>;}
