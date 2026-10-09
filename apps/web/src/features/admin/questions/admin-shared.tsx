import Link from 'next/link';
import type { ReactNode } from 'react';
import { heading,actionLink } from '@/features/questions/shared';
import { tq } from './labels';
export function AdminQuestionTitle({title,description,children}:{title:string;description:string;children?:ReactNode}){return <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h1 className={heading}>{title}</h1><p className="mt-3 text-muted">{description}</p></div>{children}</header>;}
export function AdminQuestionTabs(){return <nav aria-label={tq('questionsAdmin.navigation')} className="flex flex-wrap gap-3"><Link className={actionLink} href="/admin/questoes">{tq('questionsAdmin.inventory')}</Link><Link className={actionLink} href="/admin/questoes/fontes">{tq('questionsAdmin.sources')}</Link><Link className={actionLink} href="/admin/questoes/importacoes">{tq('questionsAdmin.imports')}</Link><Link className={actionLink} href="/app/editorial/questoes">{tq('questionsAdmin.medicalQueue')}</Link><Link className={actionLink} href="/admin/questoes/relatos">{tq('questionsAdmin.reportsTitle')}</Link></nav>;}
