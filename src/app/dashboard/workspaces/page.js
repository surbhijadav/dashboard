'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal';
import {
  Plus,
  Users,
  X,
  CheckCircle2,
  Trash2,
  UserPlus,
  Mail,
  ShieldCheck,
  Inbox,
} from 'lucide-react';

export default function WorkspacesPage() {
  const { user, isCompanyAdmin, currentWorkspace, switchWorkspace, refreshWorkspaces } = useWorkspace();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteNotice, setInviteNotice] = useState('');

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces');
      const data = await res.json();
      if (res.ok) setWorkspaces(data.workspaces || []);
    } catch (e) {
      console.error('Error fetching workspaces:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/workspaces');
        const data = await res.json();
        if (!cancelled && res.ok) setWorkspaces(data.workspaces || []);
      } catch (e) {
        console.error('Error fetching workspaces:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!selectedWorkspace) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedWorkspace(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedWorkspace]);

  const fetchWorkspaceMembers = async (wsId) => {
    try {
      setLoadingMembers(true);
      const res = await fetch(`/api/workspaces/${wsId}/members`);
      const data = await res.json();
      setWorkspaceMembers(data.members || []);
    } catch (e) {
      console.error('Error fetching members:', e);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOpenManageMembers = (ws) => {
    setSelectedWorkspace(ws);
    setInviteNotice('');
    setInviteError('');
    fetchWorkspaceMembers(ws.id);
  };

  const handleInviteToWorkspace = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !selectedWorkspace) return;

    try {
      setSubmittingInvite(true);
      setInviteError('');
      setInviteNotice('');
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, workspaceId: selectedWorkspace.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');

      setInviteEmail('');
      setInviteNotice(`Invitation sent to ${data.invitation?.email || inviteEmail}.`);
      fetchWorkspaceMembers(selectedWorkspace.id);
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleRemoveMember = async (memberUserId) => {
    if (!selectedWorkspace || !confirm('Remove access for this member?')) return;

    try {
      const res = await fetch(
        `/api/workspaces/${selectedWorkspace.id}/members?userId=${memberUserId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        fetchWorkspaceMembers(selectedWorkspace.id);
        refreshWorkspaces();
      }
    } catch (e) {
      console.error('Failed to remove member:', e);
    }
  };

  const isAdmin = isCompanyAdmin;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow text-ink-muted">
            {isAdmin ? 'Company Workspaces' : 'My Workspaces'}
          </p>
          <h1 className="mt-1.5 text-[36px] font-semibold leading-tight tracking-tight text-ink">
            {user?.companyName || 'Company'}
          </h1>
          <p className="mt-1 text-[17px] text-ink-secondary">
            {isAdmin
              ? 'Create and manage isolated workspaces for your company.'
              : 'Workspaces you have been granted access to.'}
          </p>
        </div>

        {isAdmin && (
          <button onClick={() => setCreateModalOpen(true)} className="btn-primary shrink-0 self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Create workspace
          </button>
        )}
      </div>

      {/* Workspaces grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-line bg-surface" />
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <Inbox className="mx-auto mb-3 h-5 w-5 text-ink-muted" />
          {isAdmin ? (
            <>
              <p className="text-base font-medium text-ink-secondary">No workspaces yet</p>
              <p className="mx-auto mt-1 max-w-sm text-[15px] text-ink-muted">
                Create your first workspace to start organizing your team’s work.
              </p>
              <button onClick={() => setCreateModalOpen(true)} className="btn-primary mt-4">
                <Plus className="h-4 w-4" /> Create workspace
              </button>
            </>
          ) : (
            <>
              <p className="text-base font-medium text-ink-secondary">No workspaces assigned</p>
              <p className="mx-auto mt-1 max-w-sm text-[15px] text-ink-muted">
                You don’t currently have access to any workspaces. You’ll see them here once an
                administrator invites you.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => {
            const isActive = currentWorkspace?.id === ws.id;

            return (
              <div
                key={ws.id}
                className={`flex flex-col justify-between rounded-xl border p-7 transition-colors duration-200 ${
                  isActive
                    ? 'border-accent/40 bg-accent/[0.05]'
                    : 'border-line bg-surface hover:border-line-bright'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-[15px] font-semibold text-accent-bright">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    {isActive ? (
                      <span className="inline-flex h-5 items-center gap-1.5 rounded-md bg-accent/10 px-2 text-[11px] font-medium text-accent-bright">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <button
                        onClick={() => switchWorkspace(ws.id)}
                        className="text-[13px] font-medium text-ink-secondary transition-colors duration-150 hover:text-ink"
                      >
                        Switch
                      </button>
                    )}
                  </div>

                  <h3 className="mt-3 truncate text-[17px] font-semibold text-ink">{ws.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-[2.25rem] text-[15px] leading-relaxed text-ink-muted">
                    {ws.description || 'Dedicated workspace project repository.'}
                  </p>
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-3 border-t border-line pt-3 text-[13px] text-ink-muted">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {ws.memberCount}
                    </span>
                    <span>{ws.projectCount} projects</span>
                    <span>{ws.taskCount} tasks</span>
                    <span className="ml-auto capitalize">{ws.role}</span>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleOpenManageMembers(ws)}
                      className="btn-secondary mt-3 w-full"
                    >
                      <Users className="h-3.5 w-3.5" /> Manage members
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateWorkspaceModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          fetchWorkspaces();
          refreshWorkspaces();
        }}
      />

      {/* Manage members modal */}
      {selectedWorkspace && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedWorkspace(null);
          }}
        >
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-elevated p-6 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)] animate-dropdown">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow flex items-center gap-1.5 text-ink-muted">
                  <ShieldCheck className="h-3.5 w-3.5" /> Workspace members
                </p>
                <h2 className="mt-1 text-xl font-semibold text-ink">{selectedWorkspace.name}</h2>
                <p className="mt-0.5 text-[15px] text-ink-secondary">
                  Grant or revoke access specifically for this workspace.
                </p>
              </div>
              <button
                onClick={() => setSelectedWorkspace(null)}
                className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Invite form */}
            <form onSubmit={handleInviteToWorkspace} className="mb-5 space-y-3 rounded-lg border border-line bg-app p-4">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <UserPlus className="h-4 w-4 text-accent-bright" /> Invite to this workspace
              </h4>

              {inviteError && (
                <div className="rounded-md border border-danger/30 bg-danger/10 px-2.5 py-2 text-sm text-danger-text">
                  {inviteError}
                </div>
              )}
              {inviteNotice && (
                <div className="rounded-md border border-success/25 bg-success/10 px-2.5 py-2 text-sm text-success-text">
                  {inviteNotice}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_150px]">
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  aria-label="Email to invite"
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent/50 focus:outline-none"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  aria-label="Role"
                  className="h-9 rounded-lg border border-line bg-surface px-2.5 text-[15px] text-ink-secondary focus:border-accent/50 focus:outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <button type="submit" disabled={submittingInvite} className="btn-primary w-full">
                <Mail className="h-3.5 w-3.5" />
                {submittingInvite ? 'Sending…' : 'Send invitation'}
              </button>
            </form>

            {/* Member list */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-ink-secondary">
                Workspace access ({workspaceMembers.length})
              </h4>

              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {loadingMembers ? (
                  <div className="py-4 text-center text-sm text-ink-muted">Loading members…</div>
                ) : workspaceMembers.length === 0 ? (
                  <div className="py-4 text-center text-sm text-ink-muted">
                    No members granted access to this workspace yet.
                  </div>
                ) : (
                  workspaceMembers.map((m) => (
                    <div
                      key={m._id}
                      className="flex items-center justify-between rounded-lg border border-line bg-app px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-[11px] font-medium text-ink-secondary">
                          {m.user?.name ? m.user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-medium text-ink">
                            {m.user?.name || 'User'}
                          </div>
                          <div className="truncate text-[13px] text-ink-muted">{m.user?.email}</div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                            m.role === 'admin' ? 'bg-accent/10 text-accent-bright' : 'bg-hover text-ink-secondary'
                          }`}
                        >
                          {m.role}
                        </span>
                        {m.status === 'pending' ? (
                          <span className="rounded border border-dashed border-warning/40 px-1.5 py-0.5 text-[10px] font-medium text-warning-text">
                            Pending
                          </span>
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-label="Active" />
                        )}
                        <button
                          onClick={() => handleRemoveMember(m.user?._id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger-text"
                          title={m.status === 'pending' ? 'Revoke invitation' : 'Revoke access'}
                          aria-label={`Remove ${m.user?.name || 'member'}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
