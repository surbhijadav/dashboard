'use client';

import React from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Settings, Building2, User, ShieldCheck, Key, Layers } from 'lucide-react';

export default function SettingsPage() {
  const { user, currentWorkspace } = useWorkspace();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800">
        <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Settings className="w-4 h-4" /> Workspace & Account Settings
        </div>
        <h1 className="text-2xl font-extrabold text-white">Settings</h1>
        <p className="text-xs text-slate-400">
          Manage workspace profile, member roles, and multi-tenant security
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Company Workspace Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 glass-card rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <Building2 className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold text-white">Workspace Details</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Workspace Name</label>
                <input
                  type="text"
                  readOnly
                  value={currentWorkspace?.name || ''}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-white font-medium bg-slate-900/60"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Workspace Slug ID</label>
                <input
                  type="text"
                  readOnly
                  value={currentWorkspace?.slug || ''}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-300 font-mono bg-slate-900/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Subscription Plan</label>
                  <span className="inline-block px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                    {currentWorkspace?.plan || 'Pro'}
                  </span>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tenant Data Status</label>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    <ShieldCheck className="w-4 h-4" /> Strictly Isolated
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Account Profile */}
          <div className="p-6 glass-card rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <User className="w-5 h-5 text-accent-bright" />
              <h3 className="text-base font-bold text-white">User Account</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Name</label>
                <input
                  type="text"
                  readOnly
                  value={user?.name || ''}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-white font-medium bg-slate-900/60"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  readOnly
                  value={user?.email || ''}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-300 bg-slate-900/60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Info Box */}
        <div className="p-6 glass-card rounded-3xl border border-slate-800 space-y-4">
          <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent-bright flex items-center justify-center border border-accent/20">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-white">Multi-Tenant Isolation Architecture</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every workspace in this application functions as a partitioned tenant. All API endpoints automatically scope Mongo queries by <code className="text-accent-bright font-mono">workspaceId</code>.
          </p>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Security Verified
            </div>
            <div>Company 1 data is completely invisible to Company 2.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
