'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/context/WorkspaceContext';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useWorkspace();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-app">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-line border-t-accent animate-spin" />
        <p className="text-sm text-ink-secondary">Loading workspace…</p>
      </div>
    </div>
  );
}
