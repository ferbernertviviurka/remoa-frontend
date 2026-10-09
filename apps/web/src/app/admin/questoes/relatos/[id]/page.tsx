import {QuestionReportDetail} from '@/features/editorial/questions/reports-screen';
import {requireAdmin} from '@/features/admin/shared/api';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdmin();const{id}=await params;return <QuestionReportDetail id={id} admin={true}/>;}
