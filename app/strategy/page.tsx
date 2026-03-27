'use client';

import { Suspense } from 'react';
import { Shell } from '@/components/Shell';
import { StrategyModule } from '@/components/modules/Strategy';

export default function StrategyPage() {
  return (
    <Shell>
      <Suspense fallback={<div className="flex items-center justify-center h-full text-zinc-600 text-sm">Loading...</div>}>
        <StrategyModule />
      </Suspense>
    </Shell>
  );
}
