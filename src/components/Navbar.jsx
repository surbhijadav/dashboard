'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  ChevronDown,
  Building2,
  Search,
  Bell,
  LogOut,
  Menu,
} from 'lucide-react';

export default function Navbar({ onOpenNav }) {
  const { user, logout } = useWorkspace();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const profileRef = useRef(null);

  // Platform detection for the shortcut hint (server snapshot assumes Mac to avoid hydration mismatch)
  const subscribeNoop = () => () => {};
  const isMac = useSyncExternalStore(
    subscribeNoop,
    () => /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent),
    () => true
  );

  // ⌘K / Ctrl+K focuses global search
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.matchMedia('(min-width: 768px)').matches) {
          searchRef.current?.focus();
        } else {
          setSearchOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Autofocus mobile search when expanded
  useEffect(() => {
    if (searchOpen) mobileSearchRef.current?.focus();
  }, [searchOpen]);

  // Close profile dropdown on outside click / Escape
  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-app/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-4 sm:gap-3 lg:px-6">
        {/* Mobile nav toggle */}
        <button
          onClick={onOpenNav}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary transition-colors duration-150 hover:bg-white/[0.04] hover:text-ink lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        {/* Company context (workspace switching lives in the sidebar) */}
        <div className="hidden min-w-0 items-center gap-2 md:flex">
          <Building2 className="h-4 w-4 shrink-0 text-ink-muted" />
          <span className="truncate text-[13px] font-medium text-ink-secondary">
            {user?.companyName || 'Company'}
          </span>
        </div>

        <div className="flex-1" />

        {/* Global search */}
        <div className="relative hidden w-72 md:block lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search workspaces, tasks…"
            className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-14 text-[13px] text-ink placeholder:text-ink-muted transition-colors duration-150 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
          <span className="kbd absolute right-2 top-1/2 -translate-y-1/2">
            {isMac ? '⌘ K' : 'Ctrl K'}
          </span>
        </div>

        {/* Mobile search toggle */}
        <button
          onClick={() => setSearchOpen((v) => !v)}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 md:hidden ${
            searchOpen ? 'bg-white/[0.06] text-ink' : 'text-ink-secondary hover:bg-white/[0.04] hover:text-ink'
          }`}
          aria-label="Search"
          aria-expanded={searchOpen}
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary transition-colors duration-150 hover:bg-white/[0.04] hover:text-ink"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>

        <div className="mx-1 hidden h-5 w-px bg-line sm:block" />

        {/* User profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className="flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 transition-colors duration-150 hover:bg-white/[0.04]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-elevated text-xs font-semibold text-ink-secondary">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-ink sm:block">
              {user?.name}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-ink-muted sm:block" />
          </button>

          {profileOpen && (
            <div className="panel-pop absolute right-0 top-full mt-1.5 w-60 p-1.5 animate-dropdown" role="menu">
              <div className="border-b border-line px-2.5 pb-2.5 pt-1.5">
                <p className="truncate text-[13px] font-semibold text-ink">{user?.name}</p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">{user?.email}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-muted">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate">{user?.companyName}</span>
                </div>
              </div>
              <button
                onClick={logout}
                role="menuitem"
                className="mt-1 flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium text-danger-text transition-colors duration-150 hover:bg-danger/10"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile expanded search */}
      {searchOpen && (
        <div className="border-t border-line p-2 md:hidden animate-dropdown">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              ref={mobileSearchRef}
              type="text"
              placeholder="Search workspaces, tasks…"
              onBlur={() => setSearchOpen(false)}
              onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
              className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
          </div>
        </div>
      )}
    </header>
  );
}
