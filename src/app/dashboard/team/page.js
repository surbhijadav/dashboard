'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  UserPlus,
  Search,
  MoreHorizontal,
  X,
  ChevronDown,
  ShieldOff,
  Trash2,
  Mail,
} from 'lucide-react';

function RoleBadge({ role }) {
  const styles = {
    admin: 'bg-accent/10 text-accent-bright',
    editor: 'bg-hover text-ink-secondary',
    viewer: 'bg-hover text-ink-muted',
  };
  return (
    <span
      className={`inline-flex h-5 items-center rounded-md px-2 text-[13px] font-medium capitalize ${
        styles[role] || styles.editor
      }`}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex h-5 items-center gap-1.5 rounded-md bg-warning/10 px-2 text-[13px] font-medium text-warning-text">
        <Mail className="h-3 w-3" /> Pending
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 items-center gap-1.5 rounded-md bg-success/10 px-2 text-[13px] font-medium text-success-text">
      <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
    </span>
  );
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const inputClass =
  'h-10 w-full rounded-lg border border-line bg-app px-3 text-[15px] text-ink placeholder:text-ink-muted transition-colors duration-150 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/15';

export default function TeamPage() {
  const { user, isCompanyAdmin, currentWorkspace, refreshWorkspaces } = useWorkspace();
  const [members, setMembers] = useState([]);
  const [companyMembers, setCompanyMembers] = useState([]);
  const [companyLoaded, setCompanyLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('members');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('editor');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const canManage = isCompanyAdmin || currentWorkspace?.role === 'admin';
  const pendingInvites = members.filter((m) => m.status === 'pending');
  const acceptedMembers = members.filter((m) => m.status !== 'pending');

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

  useEffect(() => {
    if (!inviteOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setInviteOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [inviteOpen]);

  // Company members tab (admin only) — loaded lazily
  useEffect(() => {
    if (tab !== 'company' || !isCompanyAdmin || companyLoaded) return;
    (async () => {
      try {
        const res = await fetch('/api/company/members');
        const data = await res.json();
        if (res.ok) {
          setCompanyMembers(data.members || []);
          setCompanyLoaded(true);
        }
      } catch (e) {
        console.error('Failed to load company members:', e);
      }
    })();
  }, [tab, isCompanyAdmin, companyLoaded]);

  const reloadMembers = async () => {
    if (!currentWorkspace?.id) return;
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/members`);
      const data = await res.json();
      setMembers(data.members || []);
    } catch (e) {
      console.error('Failed to load members:', e);
    }
  };

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
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');

      setEmail('');
      setName('');
      setInviteOpen(false);
      setNotice(`Invitation sent to ${data.member?.user?.email || email}.`);
      await reloadMembers();
      await refreshWorkspaces();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (memberUserId, isPending) => {
    if (!currentWorkspace?.id) return;
    const label = isPending ? 'revoke this invitation' : "remove this member's access";
    if (!confirm(`Are you sure you want to ${label}?`)) return;

    try {
      await fetch(`/api/workspaces/${currentWorkspace.id}/members?userId=${memberUserId}`, {
        method: 'DELETE',
      });
      await reloadMembers();
      await refreshWorkspaces();
    } catch (e) {
      console.error('Failed to remove member:', e);
    }
  };

  // ===== Employees never see team management =====
  if (!isCompanyAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-line bg-surface px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-elevated">
          <ShieldOff className="h-5 w-5 text-ink-muted" />
        </div>
                <h1 className="text-xl font-semibold text-ink">Access Restricted</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">
          You don’t have permission to manage team members. Please contact your company
          administrator if you believe this is a mistake.
        </p>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Return to Overview
        </Link>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filteredMembers = acceptedMembers.filter((m) => {
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    const matchesQuery =
      q === '' ||
      (m.user?.name || '').toLowerCase().includes(q) ||
      (m.user?.email || '').toLowerCase().includes(q);
    return matchesRole && matchesQuery;
  });

  const tabs = [
    { key: 'members', label: `Workspace Members · ${acceptedMembers.length}` },
    { key: 'invitations', label: `Invitations · ${pendingInvites.length}` },
    { key: 'company', label: 'Company Members' },
  ];

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow text-ink-muted">Team Management</p>
          <h1 className="mt-1.5 text-[36px] font-semibold leading-tight tracking-tight text-ink">
            Team Members
          </h1>
          <p className="mt-1 text-[17px] text-ink-secondary">
            Company members belong to your company. Workspace members have access to{' '}
            <span className="text-ink">{currentWorkspace?.name || 'this workspace'}</span>.
          </p>
        </div>
        {canManage && (
          <button onClick={() => setInviteOpen(true)} className="btn-primary shrink-0 self-start sm:self-auto">
            <UserPlus className="h-4 w-4" /> Invite member
          </button>
        )}
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-lg border border-success/25 bg-success/10 px-3.5 py-2.5 text-[15px] text-success-text animate-fadeIn">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss" className="ml-2 opacity-70 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label="Team sections" className="flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-[15px] font-medium transition-colors duration-150 ${
              tab === t.key
                ? 'border-accent text-ink'
                : 'border-transparent text-ink-muted hover:text-ink-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== Workspace Members tab ===== */}
      {tab === 'members' && (
        <section aria-label="Workspace members">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="eyebrow text-ink-muted">Members · {acceptedMembers.length}</span>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search members…"
                  className="h-9 w-full rounded-lg border border-line bg-surface pl-8 pr-3 text-[15px] text-ink placeholder:text-ink-muted transition-colors duration-150 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15"
                />
              </div>
              <div className="relative shrink-0">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  aria-label="Filter by role"
                  className="h-9 appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-[15px] text-ink-secondary transition-colors duration-150 focus:border-accent/50 focus:outline-none"
                >
                  <option value="all">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="hidden grid-cols-[minmax(0,1fr)_110px_110px_110px_44px] items-center gap-x-3 border-b border-line px-4 md:grid">
              <span className="eyebrow py-2.5 text-ink-muted">Member</span>
              <span className="eyebrow text-ink-muted">Role</span>
              <span className="eyebrow text-ink-muted">Joined</span>
              <span className="eyebrow text-ink-muted">Status</span>
              <span className="sr-only">Actions</span>
            </div>

            {loading ? (
              <div role="status" aria-label="Loading members">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0">
                    <div className="h-8 w-8 animate-pulse rounded-md bg-hover" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 animate-pulse rounded bg-hover" />
                      <div className="h-2.5 w-44 animate-pulse rounded bg-hover" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-[15px] font-medium text-ink-secondary">
                  {acceptedMembers.length === 0 ? 'No workspace members yet' : 'No members match your filters'}
                </p>
                <p className="mt-1 text-[15px] text-ink-muted">
                  {acceptedMembers.length === 0
                    ? 'Invite teammates to collaborate in this workspace.'
                    : 'Try a different search term or role.'}
                </p>
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {filteredMembers.map((m) => (
                  <li
                    key={m._id}
                    className="group flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3 transition-colors duration-200 last:border-b-0 hover:bg-hover/50 md:h-14 md:grid md:grid-cols-[minmax(0,1fr)_110px_110px_110px_44px] md:py-0"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3 md:min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-[15px] font-medium text-ink-secondary">
                        {m.user?.name ? m.user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium text-ink">
                          {m.user?.name || 'User'}
                        </p>
                        <p className="truncate text-sm text-ink-muted">{m.user?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 md:contents">
                      <span className="md:hidden">
                        <RoleBadge role={m.role} />
                      </span>
                      <span className="ml-auto text-sm text-ink-muted md:hidden">
                        Joined {formatDate(m.createdAt)}
                      </span>

                      <span className="hidden md:flex md:justify-start">
                        <RoleBadge role={m.role} />
                      </span>
                      <span className="hidden text-[15px] text-ink-secondary md:block">
                        {formatDate(m.createdAt)}
                      </span>
                      <span className="hidden md:flex">
                        <StatusBadge status={m.status} />
                      </span>

                      <div className="flex md:justify-end">
                        {canManage ? (
                          <button
                            onClick={() => handleRevoke(m.user?._id, false)}
                            aria-label={`Remove ${m.user?.name || 'member'} from workspace`}
                            title="Remove from workspace"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted opacity-0 transition-colors duration-150 hover:bg-danger/10 hover:text-danger-text focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            aria-label={`Actions for ${m.user?.name || 'member'}`}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted opacity-0 transition-colors duration-150 hover:bg-hover hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ===== Invitations tab ===== */}
      {tab === 'invitations' && (
        <section aria-label="Pending invitations">
          <p className="eyebrow mb-3 text-ink-muted">
            Pending invitations · {pendingInvites.length}
          </p>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            {pendingInvites.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-[15px] font-medium text-ink-secondary">No pending invitations</p>
                <p className="mt-1 text-[15px] text-ink-muted">
                  Invitations you send to this workspace will appear here until accepted.
                </p>
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {pendingInvites.map((m) => (
                  <li
                    key={m._id}
                    className="group flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3 last:border-b-0 hover:bg-hover/50 md:h-14"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-[15px] font-medium text-ink-secondary">
                      {m.user?.name ? m.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-ink">
                        {m.user?.name || 'User'}
                      </p>
                      <p className="truncate text-sm text-ink-muted">{m.user?.email}</p>
                    </div>
                    <RoleBadge role={m.role} />
                    <span className="text-sm text-ink-muted">Invited {formatDate(m.createdAt)}</span>
                    {canManage && (
                      <button
                        onClick={() => handleRevoke(m.user?._id, true)}
                        aria-label={`Revoke invitation for ${m.user?.email || 'user'}`}
                        title="Revoke invitation"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger-text"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ===== Company Members tab ===== */}
      {tab === 'company' && (
        <section aria-label="Company members">
          <p className="eyebrow mb-3 text-ink-muted">Company members · {companyMembers.length}</p>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="hidden grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)_110px] items-center gap-x-3 border-b border-line px-4 md:grid">
              <span className="eyebrow py-2.5 text-ink-muted">Member</span>
              <span className="eyebrow text-ink-muted">Company role</span>
              <span className="eyebrow text-ink-muted">Workspace access</span>
              <span className="eyebrow text-ink-muted">Joined</span>
            </div>

            {!companyLoaded ? (
              <div role="status" aria-label="Loading company members" className="px-4 py-10 text-center text-[15px] text-ink-muted">
                Loading company members…
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {companyMembers.map((m) => (
                  <li
                    key={m.id}
                    className="grid grid-cols-1 gap-x-3 gap-y-1.5 border-b border-line px-4 py-3 last:border-b-0 hover:bg-hover/50 md:grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)_110px] md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-[15px] font-medium text-ink-secondary">
                        {m.name ? m.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium text-ink">{m.name}</p>
                        <p className="truncate text-sm text-ink-muted">{m.email}</p>
                      </div>
                    </div>
                    <span className="md:justify-self-start">
                      <span
                        className={`inline-flex h-5 items-center rounded-md px-2 text-[13px] font-medium capitalize ${
                          m.companyRole === 'admin'
                            ? 'bg-accent/10 text-accent-bright'
                            : 'bg-hover text-ink-secondary'
                        }`}
                      >
                        {m.companyRole}
                      </span>
                    </span>
                    <div className="flex min-w-0 flex-wrap gap-1.5">
                      {m.workspaces.length === 0 ? (
                        <span className="text-sm text-ink-muted">No workspace access</span>
                      ) : (
                        m.workspaces.map((w) => (
                          <span
                            key={w.id}
                            title={`${w.name} · ${w.role}${w.status === 'pending' ? ' · pending' : ''}`}
                            className={`inline-flex h-5 max-w-full items-center truncate rounded-md px-2 text-[13px] font-medium ${
                              w.status === 'pending'
                                ? 'border border-dashed border-warning/40 text-warning-text'
                                : 'border border-line bg-hover text-ink-secondary'
                            }`}
                          >
                            {w.name}
                          </span>
                        ))
                      )}
                    </div>
                    <span className="text-[15px] text-ink-secondary md:text-right">
                      {formatDate(m.joined)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

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
                <h2 className="text-xl font-semibold text-ink">Invite member</h2>
                <p className="mt-0.5 text-[15px] text-ink-secondary">
                  Send an invitation to {currentWorkspace?.name || 'this workspace'}. They’ll gain
                  access only after accepting.
                </p>
              </div>
              <button
                onClick={() => setInviteOpen(false)}
                className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[15px] text-danger-text">
                {error}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label htmlFor="invite-email" className="mb-1.5 block text-sm font-medium text-ink-secondary">
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
                <label htmlFor="invite-name" className="mb-1.5 block text-sm font-medium text-ink-secondary">
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
                <label htmlFor="invite-role" className="mb-1.5 block text-sm font-medium text-ink-secondary">
                  Workspace role
                </label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={`${inputClass} appearance-none`}
                >
                  <option value="admin">Admin — full access</option>
                  <option value="editor">Editor — create & edit</option>
                  <option value="viewer">Viewer — read only</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <button type="button" onClick={() => setInviteOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  <UserPlus className="h-4 w-4" />
                  {submitting ? 'Sending…' : 'Send invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
