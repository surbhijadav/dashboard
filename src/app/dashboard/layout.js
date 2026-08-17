'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-app text-ink">
      <Navbar onOpenNav={() => setNavOpen(true)} />
      <div className="flex">
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-6 py-10 sm:px-8 lg:px-12 animate-page">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
