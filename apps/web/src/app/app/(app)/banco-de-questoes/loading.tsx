import { QuestionsSkeleton } from '@/features/questions/questions-skeleton';

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] py-2 md:px-6">
      <QuestionsSkeleton />
    </div>
  );
}
