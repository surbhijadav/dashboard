'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, Key } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { refreshWorkspaces } = useWorkspace();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      await refreshWorkspaces();
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail) => {
    try {
      setLoading(true);
      setError('');
      await fetch('/api/seed', { method: 'POST' });

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: 'password123' }),
      });

      if (res.ok) {
        await refreshWorkspaces();
        router.push('/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'Demo login failed');
      }
    } catch (e) {
      setError('Demo login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-app relative overflow-hidden">
      <div className="w-full max-w-md p-8 glass-panel rounded-3xl border border-slate-800 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-accent mx-auto flex items-center justify-center text-white mb-3 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Company Workspace Portal</h1>
          <p className="text-xs text-slate-400 mt-1">Per-workspace permissions & repository access control</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-accent hover:bg-accent-hover active:bg-accent-active text-white font-medium text-sm shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-colors duration-150 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Authenticating...' : <><ArrowRight className="w-4 h-4" /> Sign In</>}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-2.5">
          <div className="text-center text-xs text-slate-400 font-semibold mb-2 flex items-center justify-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Test Per-Workspace Permissions:
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleQuickDemoLogin('admin@company1.com')}
              type="button"
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold text-xs transition flex items-center justify-between"
            >
              <span>👑 Company Admin</span>
              <span className="text-[10px] text-slate-400">Access: Alpha & Beta Workspaces</span>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('alex@company1.com')}
              type="button"
              className="w-full py-2.5 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-semibold text-xs transition flex items-center justify-between"
            >
              <span>👤 Developer Alex</span>
              <span className="text-[10px] text-slate-400">Access: Workspace Alpha ONLY</span>
            </button>
          </div>

          <div className="pt-3 text-center">
            <p className="text-xs text-slate-400">
              Need a new company account?{' '}
              <Link href="/register" className="text-blue-400 hover:underline font-semibold">
                Register Company
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
