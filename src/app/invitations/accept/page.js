'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  MailWarning,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  PartyPopper,
  LogOut,
  KeyRound,
} from 'lucide-react';

function AcceptInvitationInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const router = useRouter();
  const { logout, refreshWorkspaces } = useWorkspace();

  const [data, setData] = useState(null); // GET /api/invitations/accept payload
  const [session, setSession] = useState(null); // { email } or null
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null); // { message, workspace, companyName }

  const load = useCallback(async () => {
    try {
      const [invRes, meRes] = await Promise.all([
        fetch(`/api/invitations/accept?token=${encodeURIComponent(token)}`),
        fetch('/api/auth/me'),
      ]);
      const inv = await invRes.json();
      if (!invRes.ok) {
        setPageError(inv.error || 'Invitation not found.');
        setData(null);
      } else {
        setData(inv);
      }
      if (meRes.ok) {
        const me = await meRes.json();
        setSession({ email: me.user?.email, name: me.user?.name });
      } else {
        setSession(null);
      }
    } catch (e) {
      setPageError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [token, load]);

  const handleAccept = async () => {
    try {
      setSubmitting(true);
      setPageError('');
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
      await refreshWorkspaces();
      setSuccess(json);
    } catch (e) {
      setPageError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !password) return;
    try {
      setSubmitting(true);
      setPageError('');
      const res = await fetch('/api/invitations/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
      await refreshWorkspaces();
      setSuccess(json);
    } catch (e) {
      setPageError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return;
    try {
      setSubmitting(true);
      setPageError('');
      const res = await fetch('/api/invitations/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
      setNewPassword('');
      setShowSetPassword(false);
      await refreshWorkspaces();
      await load();
    } catch (e2) {
      setPageError(e2.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    setSession(null);
    setSuccess(null);
  };

  const inputClass =
    'h-11 w-full rounded-lg border border-line bg-app px-3.5 text-[15px] text-ink placeholder:text-ink-muted transition-colors duration-150 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/15';

  const card = (children) => (
    <div className="w-full max-w-md rounded-2xl border border-line bg-elevated p-8 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)]">
      {children}
    </div>
  );

  if (loading && token) {
    return card(
      <div className="py-12 text-center text-[15px] text-ink-muted">Validating your invitation…</div>
    );
  }

  if (!token) {
    return card(
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-warning/25 bg-warning/10 text-warning-text">
          <MailWarning className="h-6 w-6" />
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Invitation unavailable</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">Invitation not found.</p>
        <Link href="/login" className="btn-secondary mt-6 w-full">
          Back to sign in
        </Link>
      </div>
    );
  }

  // ---------- Success state ----------
  if (success) {
    return card(
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-success/25 bg-success/10 text-success-text">
          <PartyPopper className="h-6 w-6" />
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Welcome to {success.companyName || 'your workspace'}
        </h1>
        <p className="mt-2 text-[15px] text-ink-secondary">
          You&rsquo;ve joined <span className="font-medium text-ink">{success.workspace?.name || 'the workspace'}</span>.
        </p>
        {success.alreadyMember && (
          <p className="mt-2 text-[13px] text-ink-muted">You already had access to this workspace.</p>
        )}
        <button
          onClick={() => router.push('/dashboard')}
          className="btn-primary mt-6 w-full"
        >
          <ArrowRight className="h-4 w-4" /> Open Workspace
        </button>
      </div>
    );
  }

  // ---------- Invalid / error state ----------
  if (!data) {
    return card(
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-warning/25 bg-warning/10 text-warning-text">
          <MailWarning className="h-6 w-6" />
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Invitation unavailable</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">{pageError || 'Invitation not found.'}</p>
        <p className="mt-3 text-[13px] text-ink-muted">
          Please contact your company administrator to request a new invitation.
        </p>
        <Link href="/login" className="btn-secondary mt-6 w-full">
          Back to sign in
        </Link>
      </div>
    );
  }

  const inv = data.invitation;
  const authedMatching = data.authenticated && session && session.email?.toLowerCase() === inv.email.toLowerCase();
  const authedWrongEmail = data.authenticated && !authedMatching;
  const redirectParam = encodeURIComponent(`/invitations/accept?token=${encodeURIComponent(token)}`);

  return card(
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent-bright">
          <Building2 className="h-6 w-6" />
        </div>
        <p className="eyebrow text-ink-muted">You&rsquo;re invited to join</p>
        <h1 className="mt-1.5 text-[24px] font-semibold tracking-tight text-ink">{inv.companyName}</h1>
        <p className="mt-1 text-[15px] text-ink-secondary">
          {inv.workspaceName} <span className="text-ink-muted">·</span>{' '}
          <span className="capitalize">{inv.role}</span>
        </p>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[13px] text-ink-muted">
          <Mail className="h-3.5 w-3.5" /> Invited by {inv.invitedBy}
        </p>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-[13px] text-ink-muted">
          <Clock className="h-3.5 w-3.5" /> Expires {new Date(inv.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {pageError && (
        <div className="mb-5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-center text-[13px] text-danger-text">
          {pageError}
        </div>
      )}

      {/* Authenticated with the matching account — accept directly */}
      {authedMatching && (
        <button onClick={handleAccept} disabled={submitting} className="btn-primary w-full">
          <CheckCircle2 className="h-4 w-4" />
          {submitting ? 'Accepting…' : 'Accept Invitation'}
        </button>
      )}

      {/* Authenticated as a different email — block acceptance */}
      {authedWrongEmail && (
        <div>
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-3 text-[13px] leading-relaxed text-warning-text">
            <ShieldAlert className="mr-1.5 inline h-4 w-4" />
            This invitation was sent to <strong>{inv.email}</strong>. You are signed in as{' '}
            <strong>{session?.email}</strong>.
          </div>
          <button onClick={handleSwitchAccount} className="btn-secondary mt-4 w-full">
            <LogOut className="h-4 w-4" /> Switch account
          </button>
        </div>
      )}

      {/* Not authenticated — existing account: continue to login, or claim
          the account by setting a new password with the invitation link */}
      {!data.authenticated && data.hasAccount && !showSetPassword && (
        <div className="space-y-3">
          <Link href={`/login?redirect=${redirectParam}`} className="btn-primary w-full">
            <ArrowRight className="h-4 w-4" /> Continue to login
          </Link>
          <p className="text-center text-[13px] text-ink-muted">
            An account already exists for {inv.email}.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowSetPassword(true);
              setPageError('');
            }}
            className="flex w-full items-center justify-center gap-1.5 text-center text-[13px] font-medium text-accent-bright hover:underline"
          >
            <KeyRound className="h-3.5 w-3.5" /> Don&rsquo;t know your password? Set a new one
          </button>
        </div>
      )}

      {!data.authenticated && data.hasAccount && showSetPassword && (
        <form onSubmit={handleSetPassword} className="space-y-4">
          <div>
            <label htmlFor="inv-new-password" className="mb-1.5 block text-[13px] font-medium text-ink-secondary">
              New password
            </label>
            <input
              id="inv-new-password"
              type="password"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            <KeyRound className="h-4 w-4" />
            {submitting ? 'Saving…' : 'Set password & continue'}
          </button>
          <button
            type="button"
            onClick={() => setShowSetPassword(false)}
            className="w-full text-center text-[13px] text-ink-muted hover:text-ink-secondary hover:underline"
          >
            Back to sign in
          </button>
        </form>
      )}

      {/* Not authenticated — no account: create one */}
      {!data.authenticated && !data.hasAccount && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="inv-name" className="mb-1.5 block text-[13px] font-medium text-ink-secondary">
              Your name
            </label>
            <input
              id="inv-name"
              type="text"
              required
              placeholder="Alex Rivers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="inv-email" className="mb-1.5 block text-[13px] font-medium text-ink-secondary">
              Email
            </label>
            <input
              id="inv-email"
              type="email"
              value={inv.email}
              readOnly
              disabled
              className={`${inputClass} cursor-not-allowed opacity-60`}
            />
          </div>
          <div>
            <label htmlFor="inv-password" className="mb-1.5 block text-[13px] font-medium text-ink-secondary">
              Password
            </label>
            <input
              id="inv-password"
              type="password"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            <UserPlus className="h-4 w-4" />
            {submitting ? 'Creating account…' : 'Create your account'}
          </button>
          <p className="text-center text-[13px] text-ink-muted">
            Already have an account?{' '}
            <Link href={`/login?redirect=${redirectParam}`} className="font-medium text-accent-bright hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app p-4">
      <Suspense fallback={null}>
        <AcceptInvitationInner />
      </Suspense>
    </div>
  );
}
