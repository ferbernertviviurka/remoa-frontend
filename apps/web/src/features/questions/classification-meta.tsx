import type {QuestionPublic} from '@remoa/contracts';
import {Tag} from '@remoa/ui';
import {t} from './labels';

/** Search-index suggestions do not change the original source taxonomy or its review status. */
export function ClassificationMeta({classification,kind}:{classification?:QuestionPublic['classification'];kind?:QuestionPublic['classificationKind']}){
 const actual=classification?.kind??kind;
 if(!actual)return null;
 return <div className="basis-full min-w-0 space-y-1 text-sm text-muted"><Tag tone={actual==='automatic_unreviewed'?'watch':'unknown'}>{t(actual==='automatic_unreviewed'?'questions.classification.automatic':'questions.classification.reviewed')}</Tag>{classification?<><p>{t('questions.area')}: {classification.area.label}</p><p>{t('questions.topic')}: {classification.topic.label}</p></>:null}</div>;
}
