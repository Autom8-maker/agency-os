'use client';

import { Suspense } from 'react';
import { Shell } from '@/components/Shell';
import { CreativeModule } from '@/components/modules/Creative';

export default function CreativePage() {
  return (
    <Shell>
      <Suspense fallback={<div className="flex items-center justify-center h-full text-zinc-600 text-sm">Loading...</div>}>
        <CreativeModule />
      </Suspense>
    </Shell>
  );
}
