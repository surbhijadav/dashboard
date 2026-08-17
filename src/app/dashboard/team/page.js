'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { UserPlus, Search, MoreHorizontal, X, ChevronDown } from 'lucide-react';

function RoleBadge({ role }) {
  const styles = {
    admin: 'bg-accent/10 text-accent-bright',
    member: 'bg-white/5 text-ink-secondary',
    viewer: 'bg-white/5 text-ink-muted',
  };
  return (
    <span
      className={`inline-flex h-5 items-center rounded-md px-2 text-[11px] font-medium capitalize ${
        styles[role] || styles.member
      }`}
    >
      {role}
    </span>
  );
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TeamPage() {
  const { currentWorkspace } = useWorkspace();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('member');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchMembers = async () => {
    if (!currentWorkspace?.id) return;
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/members`);
      const data = await res.json();
      setMembers(data.members || []);
    } catch (e) {
      console.error('Failed to load members:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workspaces/${currentWorkspace.id}/members`);
        const data = await res.json();
        if (!cancelled) setMembers(data.members || []);
      } catch (e) {
        console.error('Failed to load members:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentWorkspace?.id]);

  // Close the invite modal with Escape
  useEffect(() => {
    if (!inviteOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setInviteOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [inviteOpen]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email || !currentWorkspace) return;

    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');

      setEmail('');
      setName('');
      setInviteOpen(false);
      fetchMembers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const q = query.trim().toLowerCase();
  const filteredMembers = members.filter((m) => {
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    const matchesQuery =
      q === '' ||
      (m.user?.name || '').toLowerCase().includes(q) ||
      (m.user?.email || '').toLowerCase().includes(q);
    return matchesRole && matchesQuery;
  });

  const inputClass =
    'h-10 w-full rounded-lg border border-line bg-app px-3 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/15';

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow text-ink-muted">Team Management</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-tight text-ink">
            Team Members
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Manage people who have access to this workspace.
          </p>
        </div>
        <button onClick={() => setInviteOpen(true)} className="btn-primary shrink-0 self-start sm:self-auto">
          <UserPlus className="h-4 w-4" /> Invite member
        </button>
      </div>

      {/* Members section */}
      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="eyebrow text-ink-muted">Members · {members.length}</span>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members…"
                className="h-9 w-full rounded-lg border border-line bg-surface pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-muted transition-colors duration-150 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15"
              />
            </div>
            <div className="relative shrink-0">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by role"
                className="h-9 appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-[13px] text-ink-secondary transition-colors duration-150 focus:border-accent/50 focus:outline-none"
              >
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {/* Column headers */}
          <div className="hidden grid-cols-[minmax(0,1fr)_110px_110px_44px] items-center gap-x-3 border-b border-line px-4 md:grid">
            <span className="eyebrow text-ink-muted">Member</span>
            <span className="eyebrow text-ink-muted">Role</span>
            <span className="eyebrow text-ink-muted">Joined</span>
            <span className="sr-only">Actions</span>
          </div>

          {loading ? (
            <div role="status" aria-label="Loading members">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0">
                  <div className="h-8 w-8 animate-pulse rounded-md bg-white/5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-28 animate-pulse rounded bg-white/5" />
                    <div className="h-2.5 w-44 animate-pulse rounded bg-white/5" />
                  </div>
                  <div className="hidden h-3 w-12 animate-pulse rounded bg-white/5 md:block" />
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-medium text-ink-secondary">
                {members.length === 0 ? 'No members yet' : 'No members match your filters'}
              </p>
              <p className="mt-1 text-[13px] text-ink-muted">
                {members.length === 0
                  ? 'Invite teammates to collaborate in this workspace.'
                  : 'Try a different search term or role.'}
              </p>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {filteredMembers.map((m) => (
                <li
                  key={m._id}
                  className="group flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3 transition-colors duration-200 last:border-b-0 hover:bg-white/[0.02] md:grid md:h-14 md:grid-cols-[minmax(0,1fr)_110px_110px_44px] md:py-0"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3 md:min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-[13px] font-medium text-ink-secondary">
                      {m.user?.name ? m.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {m.user?.name || 'User'}
                      </p>
                      <p className="truncate text-xs text-ink-muted">{m.user?.email}</p>
                    </div>
                  </div>

                  {/* Mobile meta */}
                  <div className="flex items-center gap-3 md:contents">
                    <span className="md:hidden">
                      <RoleBadge role={m.role} />
                    </span>
                    <span className="ml-auto text-xs text-ink-muted md:hidden">
                      Joined {formatDate(m.createdAt)}
                    </span>

                    <span className="hidden md:flex md:justify-start">
                      <RoleBadge role={m.role} />
                    </span>
                    <span className="hidden text-[13px] text-ink-secondary md:block">
                      {formatDate(m.createdAt)}
                    </span>

                    <div className="flex md:justify-end">
                      <button
                        aria-label={`Actions for ${m.user?.name || 'member'}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted opacity-0 transition-colors duration-150 hover:bg-white/5 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Invite modal */}
      {inviteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInviteOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-line bg-elevated p-6 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)] animate-dropdown">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Invite member</h2>
                <p className="mt-0.5 text-[13px] text-ink-secondary">
                  Add a collaborator to {currentWorkspace?.name || 'this workspace'}.
                </p>
              </div>
              <button
                onClick={() => setInviteOpen(false)}
                className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-white/5 hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] text-danger-text">
                {error}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label htmlFor="invite-email" className="mb-1.5 block text-xs font-medium text-ink-secondary">
                  Email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="invite-name" className="mb-1.5 block text-xs font-medium text-ink-secondary">
                  Full name <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <input
                  id="invite-name"
                  type="text"
                  placeholder="Alex Rivers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="invite-role" className="mb-1.5 block text-xs font-medium text-ink-secondary">
                  Workspace role
                </label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={`${inputClass} appearance-none`}
                >
                  <option value="admin">Admin — full access</option>
                  <option value="member">Member — create & edit</option>
                  <option value="viewer">Viewer — read only</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <button type="button" onClick={() => setInviteOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  <UserPlus className="h-4 w-4" />
                  {submitting ? 'Inviting…' : 'Add member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
