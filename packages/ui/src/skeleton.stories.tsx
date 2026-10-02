import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton, SkeletonBlock, SkeletonRegion } from './skeleton';

const meta = { title: 'Skeleton', component: Skeleton } satisfies Meta<typeof Skeleton>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { lines: 3 }, render: (args) => <div className="max-w-sm"><Skeleton {...args} /></div> };
export const Block: StoryObj = {
  render: () => (
    <SkeletonRegion label="Carregando…">
      <div className="flex gap-4"><SkeletonBlock width={200} height={120} radius={28} /><SkeletonBlock width={120} height={24} radius={999} /></div>
    </SkeletonRegion>
  ),
};
