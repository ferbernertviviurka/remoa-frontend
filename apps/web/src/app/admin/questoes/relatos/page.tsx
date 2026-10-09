import {QuestionReportsQueue} from '@/features/editorial/questions/reports-screen';
import {requireAdmin} from '@/features/admin/shared/api';
export default async function Page(){await requireAdmin();return <QuestionReportsQueue admin={true}/>;}
