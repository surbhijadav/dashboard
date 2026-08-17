'use client';

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal';
import {
  FolderGit2,
  Plus,
  Users,
  ShieldCheck,
  UserPlus,
  Trash2,
  X,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function WorkspacesPage() {
  const { user, workspaces, currentWorkspace, switchWorkspace, refreshWorkspaces } = useWorkspace();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');

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
    fetchWorkspaceMembers(ws.id);
  };

  const handleInviteToWorkspace = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !selectedWorkspace) return;

    try {
      setSubmittingInvite(true);
      setInviteError('');
      const res = await fetch(`/api/workspaces/${selectedWorkspace.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member to workspace');

      setInviteEmail('');
      setInviteName('');
      fetchWorkspaceMembers(selectedWorkspace.id);
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleRemoveMember = async (memberUserId) => {
    if (!selectedWorkspace || !confirm('Remove this member\'s access from this specific workspace?')) return;

    try {
      const res = await fetch(`/api/workspaces/${selectedWorkspace.id}/members?userId=${memberUserId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchWorkspaceMembers(selectedWorkspace.id);
      }
    } catch (e) {
      console.error('Failed to remove member:', e);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FolderGit2 className="w-4 h-4" /> Company Workspaces Directory
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            {user?.companyName || 'Company'} Workspaces
          </h1>
          <p className="text-xs text-slate-400">
            Workspaces act like repositories. Team members only see workspaces they are explicitly granted access to.
          </p>
        </div>

        <button onClick={() => setCreateModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Create Workspace
        </button>
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workspaces.map((ws) => {
          const isActive = currentWorkspace?.id === ws.id;

          return (
            <div
              key={ws.id}
              className={`p-6 glass-card rounded-3xl border transition flex flex-col justify-between space-y-4 ${
                isActive
                  ? 'border-blue-500/50 bg-blue-950/20 shadow-lg shadow-blue-500/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg border border-accent/20 bg-accent/10 flex items-center justify-center text-accent-bright font-semibold text-base">
                    {ws.name.charAt(0)}
                  </div>
                  {isActive ? (
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <button
                      onClick={() => switchWorkspace(ws.id)}
                      className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                    >
                      Switch to Workspace
                    </button>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white">{ws.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {ws.description || 'Dedicated workspace project repository.'}
                </p>

                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                    Role: {ws.role || 'member'}
                  </span>
                  <span className="text-slate-500">• Access Granted</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => handleOpenManageMembers(ws)}
                  className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-blue-400 hover:text-blue-300 text-xs font-semibold border border-slate-700/60 transition flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" /> Workspace Member Permissions
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <CreateWorkspaceModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />

      {/* Workspace Member Permissions Modal */}
      {selectedWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-6 glass-panel rounded-3xl border border-slate-700/60 shadow-2xl relative space-y-5">
            <button
              onClick={() => setSelectedWorkspace(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" /> Workspace Permission Control
              </div>
              <h3 className="text-xl font-bold text-white mt-1">
                {selectedWorkspace.name} Members
              </h3>
              <p className="text-xs text-slate-400">
                Grant or revoke team member access specifically for this workspace.
              </p>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInviteToWorkspace} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-blue-400" /> Grant Access to User
              </h4>

              {inviteError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
                  {inviteError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 glass-input rounded-xl text-xs"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 glass-input rounded-xl text-xs bg-slate-900"
                >
                  <option value="editor">Editor (Can edit tasks)</option>
                  <option value="admin">Admin (Full Control)</option>
                  <option value="viewer">Viewer (Read Only)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submittingInvite}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition disabled:opacity-50"
              >
                {submittingInvite ? 'Granting...' : 'Grant Access to Workspace'}
              </button>
            </form>

            {/* Existing Workspace Members List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300">
                Current Workspace Access List ({workspaceMembers.length})
              </h4>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {loadingMembers ? (
                  <div className="text-center py-4 text-xs text-slate-500">Loading members...</div>
                ) : workspaceMembers.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">No extra members granted access to this workspace.</div>
                ) : (
                  workspaceMembers.map((m) => (
                    <div
                      key={m._id}
                      className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center">
                          {m.user?.name ? m.user.name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{m.user?.name || 'User'}</div>
                          <div className="text-[10px] text-slate-400">{m.user?.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/10 text-blue-400 capitalize">
                          {m.role}
                        </span>
                        <button
                          onClick={() => handleRemoveMember(m.user?._id)}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                          title="Revoke access from this workspace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
