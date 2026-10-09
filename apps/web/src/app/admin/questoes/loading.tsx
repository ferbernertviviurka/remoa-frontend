import { QuestionsSkeleton } from '@/features/questions/questions-skeleton';

export default function Loading() {
  return (
    <div className="p-5 md:p-9">
      <QuestionsSkeleton />
    </div>
  );
}
