'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWorkspace } from '@/context/WorkspaceContext';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import {
  LayoutDashboard,
  FolderGit2,
  KanbanSquare,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  ChevronsUpDown,
  Check,
  Plus,
  Search,
  X,
} from 'lucide-react';

const adminNav = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Workspaces', href: '/dashboard/workspaces', icon: FolderGit2 },
  { name: 'Projects & Tasks', href: '/dashboard/projects', icon: KanbanSquare },
  { name: 'Team Members', href: '/dashboard/team', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
];

const employeeNav = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Workspaces', href: '/dashboard/workspaces', icon: FolderGit2 },
  { name: 'My Projects & Tasks', href: '/dashboard/projects', icon: KanbanSquare },
  { name: 'My Activity', href: '/dashboard/activity', icon: BarChart3 },
];

const systemNav = [{ name: 'Settings', href: '/dashboard/settings', icon: Settings }];

function NavLink({ item }) {
  const pathname = usePathname();
  const Icon = item.icon;
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={`group flex h-11 items-center gap-3.5 rounded-lg px-4 text-[15px] font-medium transition-colors duration-150 ease-out ${
        isActive
          ? 'bg-accent/10 text-ink'
          : 'text-ink-secondary hover:bg-white/[0.04] hover:text-ink'
      }`}
    >
      <Icon
        className={`h-5 w-5 shrink-0 transition-colors duration-150 ${
          isActive ? 'text-accent-bright' : 'text-ink-muted group-hover:text-ink-secondary'
        }`}
      />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const { user, isCompanyAdmin, workspaces, currentWorkspace, switchWorkspace, refreshWorkspaces } =
    useWorkspace();
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [wsQuery, setWsQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const switcherRef = useRef(null);

  // Close workspace dropdown on outside click / Escape
  useEffect(() => {
    if (!switcherOpen) return;
    const onPointerDown = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setSwitcherOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSwitcherOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [switcherOpen]);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  // Close the drawer after navigation on small screens
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const filteredWorkspaces = workspaces.filter((w) =>
    (w.name || '').toLowerCase().includes(wsQuery.trim().toLowerCase())
  );

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      setSeedMessage('');
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSeedMessage('Demo workspaces initialized!');
        await refreshWorkspaces();
        setTimeout(() => setSeedMessage(''), 4000);
      }
    } catch (e) {
      console.error('Seed error:', e);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 animate-fadeIn lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[304px] flex-col border-r border-line bg-sidebar transition-transform duration-200 ease-out lg:sticky lg:top-20 lg:z-20 lg:h-[calc(100vh-5rem)] lg:w-80 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* COMPANY — workspace selector */}
        <div className="border-b border-line p-4">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="eyebrow truncate text-ink-muted">{user?.companyName || 'Company'}</span>
            <button
              onClick={onClose}
              className="-mr-1 flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-hover hover:text-ink lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative" ref={switcherRef}>
            <button
              onClick={() => {
                setSwitcherOpen((v) => !v);
                setWsQuery('');
              }}
              aria-expanded={switcherOpen}
              aria-haspopup="listbox"
              className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors duration-150 ${
                switcherOpen ? 'bg-white/[0.04]' : 'hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-accent/20 bg-accent/10 text-[13px] font-semibold text-accent-bright">
                {(currentWorkspace?.name || 'W').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium text-ink">
                  {currentWorkspace?.name || 'No workspace'}
                </div>
                <div className="truncate text-[13px] capitalize text-ink-muted">
                  {currentWorkspace?.role || 'member'}
                </div>
              </div>
              <ChevronsUpDown className="h-4.5 w-4.5 shrink-0 text-ink-muted" />
            </button>

            {switcherOpen && (
              <div
                className="panel-pop absolute left-0 right-0 top-full z-50 mt-1.5 p-1.5 animate-dropdown"
                role="listbox"
                aria-label={isCompanyAdmin ? 'Company workspaces' : 'My workspaces'}
              >
                <div className="relative mb-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                  <input
                    autoFocus
                    type="text"
                    value={wsQuery}
                    onChange={(e) => setWsQuery(e.target.value)}
                    placeholder="Search workspaces…"
                    className="h-10 w-full rounded-md border border-line bg-sidebar pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent/50 focus:outline-none"
                  />
                </div>

                <p className="eyebrow px-2.5 py-1 text-ink-muted">
                  {isCompanyAdmin ? 'Company workspaces' : 'My workspaces'}
                </p>

                <div className="max-h-56 overflow-y-auto py-0.5">
                  {filteredWorkspaces.length === 0 ? (
                    <p className="px-2.5 py-3 text-center text-xs text-ink-muted">
                      {workspaces.length === 0
                        ? 'No workspaces assigned to you yet.'
                        : 'No workspaces match your search.'}
                    </p>
                  ) : (
                    filteredWorkspaces.map((w) => {
                      const active = currentWorkspace?.id === w.id;
                      return (
                        <button
                          key={w.id}
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            switchWorkspace(w.id);
                            setSwitcherOpen(false);
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 ${
                            active ? 'bg-accent/10' : 'hover:bg-white/[0.04]'
                          }`}
                        >
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-[13px] font-semibold ${
                              active
                                ? 'border-accent/20 bg-accent/10 text-accent-bright'
                                : 'border-line bg-surface text-ink-secondary'
                            }`}
                          >
                            {(w.name || 'W').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px] font-medium text-ink">{w.name}</div>
                            <div className="truncate text-[13px] capitalize text-ink-muted">
                              {w.role || 'editor'}
                            </div>
                          </div>
                          {active && <Check className="h-3.5 w-3.5 shrink-0 text-accent-bright" />}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="mt-1 border-t border-line pt-1">
                  {isCompanyAdmin && (
                    <button
                      onClick={() => {
                        setSwitcherOpen(false);
                        setCreateOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-accent-bright transition-colors duration-150 hover:bg-accent/10"
                    >
                      <Plus className="h-4 w-4" /> Create workspace
                    </button>
                  )}
                  {!isCompanyAdmin && workspaces.length === 0 && (
                    <p className="px-2.5 py-2 text-[11px] leading-relaxed text-ink-muted">
                      No workspaces yet. You’ll see them here once an administrator invites you.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAIN + SYSTEM navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div>
            <p className="eyebrow mb-2 px-4 text-ink-muted">Main</p>
            <div className="space-y-1.5">
              {(isCompanyAdmin ? adminNav : employeeNav).map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
          <div className="mt-7">
            <p className="eyebrow mb-2 px-4 text-ink-muted">System</p>
            <div className="space-y-1.5">
              {systemNav.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        </nav>

        {/* Bottom utility (admin demo tooling) */}
        {isCompanyAdmin && (
          <div className="border-t border-line p-4">
            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              title="Create sample workspaces to test per-workspace permissions"
              className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors duration-150 hover:bg-hover hover:text-ink-secondary disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {seeding ? 'Seeding…' : 'Seed demo data'}
            </button>
            {seedMessage && (
              <p className="mt-1.5 px-2.5 text-[11px] font-medium text-success-text animate-fadeIn">
                {seedMessage}
              </p>
            )}
          </div>
        )}
      </aside>

      <CreateWorkspaceModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
