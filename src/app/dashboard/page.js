'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/context/WorkspaceContext';
import StatCard from '@/components/StatCard';
import {
  Users,
  FolderGit2,
  CircleDot,
  CheckCircle2,
  Check,
  X,
  ArrowRight,
  Plus,
  Inbox,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

const ACCENT = '#5e6ad2';
const ACCENT_BRIGHT = '#98a0e8';
const SUCCESS = '#22c55e';
const MUTED = '#71717a';
const CHART_GRID = '#24252d';
const TOOLTIP_STYLE = {
  backgroundColor: '#15161d',
  borderColor: '#24252d',
  borderRadius: '8px',
  color: '#f5f5f7',
  fontSize: '12px',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StatusBadge({ status }) {
  const styles = {
    completed: 'bg-success/10 text-success-text',
    in_progress: 'bg-accent/10 text-accent-bright',
    in_review: 'bg-accent/5 text-accent-bright',
    todo: 'bg-hover text-ink-secondary',
  };
  const labels = {
    completed: 'Completed',
    in_progress: 'In progress',
    in_review: 'In review',
    todo: 'To do',
  };
  return (
    <span
      className={`inline-flex h-5.5 items-center rounded-md px-2.5 text-[13px] font-medium ${
        styles[status] || styles.todo
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

function SectionCard({ title, subtitle, action, children }) {
  return (
    <div className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-7 py-5">
        <div>
          <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ActivityTable({ activities }) {
  return (
    <ul className="m-0 list-none p-0">
      {activities.map((a) => (
        <li
          key={a._id}
          className="flex items-center gap-3 border-b border-line px-7 py-4 last:border-b-0"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-[11px] font-medium text-ink-secondary">
            {a.user?.name ? a.user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] text-ink">
              <span className="font-medium">{a.user?.name || 'User'}</span>
              <span className="text-ink-secondary"> · {a.action}</span>
            </p>
            <p className="truncate text-sm text-ink-muted">{a.details}</p>
          </div>
          <span className="hidden shrink-0 text-sm text-ink-muted sm:block">
            {a.workspace?.name}
          </span>
          <span className="shrink-0 text-sm text-ink-muted">{formatTime(a.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const { user, isCompanyAdmin, refreshWorkspaces } = useWorkspace();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/overview');
        const json = await res.json();
        if (!cancelled && res.ok) setData(json);
      } catch (e) {
        console.error('Failed to load overview:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleInvitation = async (workspaceId, action) => {
    setActing(workspaceId);
    try {
      await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await refreshWorkspaces();
      setData((prev) =>
        prev
          ? {
              ...prev,
              invitations: prev.invitations.filter((i) => i.workspaceId !== workspaceId),
            }
          : prev
      );
    } catch (e) {
      console.error('Invitation action failed:', e);
    } finally {
      setActing(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded bg-hover" />
          <div className="h-8 w-64 animate-pulse rounded bg-hover" />
          <div className="h-3 w-80 animate-pulse rounded bg-hover" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-line bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  const firstName = (user?.name || '').split(' ')[0] || 'there';

  // ============================================================
  // EMPLOYEE DASHBOARD
  // ============================================================
  if (data.companyRole === 'employee') {
    const noWorkspaces = data.myWorkspaces.length === 0;
    return (
      <div className="space-y-10">
        <div>
          <p className="eyebrow text-ink-muted">My Overview</p>
          <h1 className="mt-1.5 text-[36px] font-semibold leading-tight tracking-tight text-ink">
            {greeting()}, {firstName}.
          </h1>
          <p className="mt-1 text-[17px] text-ink-secondary">
            Here’s what’s happening across your workspaces.
          </p>
        </div>

        {/* Pending invitations */}
        {data.invitations.length > 0 && (
          <section aria-label="Pending invitations">
            <p className="eyebrow mb-3 text-ink-muted">Pending invitations</p>
            <div className="space-y-2">
              {data.invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-elevated text-[15px] font-semibold text-accent-bright">
                      {inv.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-ink">
                        You’ve been invited to {inv.name}
                      </p>
                      <p className="truncate text-sm text-ink-muted">
                        {user?.companyName} · Role: <span className="capitalize">{inv.role}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleInvitation(inv.workspaceId, 'decline')}
                      disabled={acting === inv.workspaceId}
                      className="btn-secondary h-8"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                    <button
                      onClick={() => handleInvitation(inv.workspaceId, 'accept')}
                      disabled={acting === inv.workspaceId}
                      className="btn-primary h-8"
                    >
                      <Check className="h-3.5 w-3.5" /> Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My workspaces */}
        <section aria-label="My workspaces">
          <p className="eyebrow mb-3 text-ink-muted">My workspaces</p>
          {noWorkspaces ? (
            <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
              <Inbox className="mx-auto mb-3 h-5 w-5 text-ink-muted" />
              <p className="text-base font-medium text-ink-secondary">No workspaces assigned</p>
              <p className="mx-auto mt-1 max-w-sm text-[15px] text-ink-muted">
                You don’t currently have access to any workspaces. You’ll see them here once an
                administrator invites you.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.myWorkspaces.map((w) => (
                <Link
                  key={w.id}
                  href="/dashboard/projects"
                  className="group rounded-xl border border-line bg-surface p-7 transition-colors duration-200 hover:border-line-bright"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-[15px] font-semibold text-accent-bright">
                      {w.name.charAt(0).toUpperCase()}
                    </div>
                    <ArrowRight className="h-4 w-4 text-ink-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                  </div>
                  <p className="mt-3 truncate text-base font-medium text-ink">{w.name}</p>
                  <p className="mt-0.5 line-clamp-1 text-sm text-ink-muted">
                    {w.description || 'Workspace'}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-muted">
                    <span className="rounded border border-line bg-hover px-1.5 py-px capitalize">
                      {w.role}
                    </span>
                    <span>· {w.projectCount} projects</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* My tasks */}
        <section aria-label="My tasks">
          <p className="eyebrow mb-3 text-ink-muted">My tasks</p>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="hidden grid-cols-[minmax(0,1fr)_130px_100px_110px] gap-x-3 border-b border-line px-4 py-2.5 md:grid">
              <span className="eyebrow text-ink-muted">Task</span>
              <span className="eyebrow text-ink-muted">Project</span>
              <span className="eyebrow text-ink-muted">Due</span>
              <span className="eyebrow text-ink-muted">Status</span>
            </div>
            {data.myTasks.length === 0 ? (
              <p className="px-5 py-10 text-center text-[15px] text-ink-muted">
                No tasks assigned to you yet.
              </p>
            ) : (
              <ul className="m-0 list-none p-0">
                {data.myTasks.map((t) => (
                  <li
                    key={t._id}
                    className="grid grid-cols-1 gap-1 border-b border-line px-4 py-3 last:border-b-0 hover:bg-hover/50 md:grid-cols-[minmax(0,1fr)_130px_100px_110px] md:items-center md:gap-x-3"
                  >
                    <p className="truncate text-[15px] font-medium text-ink">{t.title}</p>
                    <span className="truncate text-sm text-ink-secondary">
                      {t.project?.name || '—'}
                    </span>
                    <span className="text-sm text-ink-muted">{formatTime(t.dueDate)}</span>
                    <span className="mt-1 md:mt-0">
                      <StatusBadge status={t.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Recent activity */}
        {data.recentActivities.length > 0 && (
          <SectionCard title="Recent activity" subtitle="Across your workspaces">
            <ActivityTable activities={data.recentActivities} />
          </SectionCard>
        )}
      </div>
    );
  }

  // ============================================================
  // ADMIN DASHBOARD — company overview
  // ============================================================
  const stats = data.stats || { activeMembers: 0, workspaces: 0, openTasks: 0, completedTasks: 0 };
  const donutData = [
    { name: 'Completed', value: data.taskStatus?.completed || 0, color: SUCCESS },
    { name: 'In progress', value: data.taskStatus?.inProgress || 0, color: ACCENT },
    { name: 'In review', value: data.taskStatus?.review || 0, color: ACCENT_BRIGHT },
    { name: 'To do', value: data.taskStatus?.todo || 0, color: MUTED },
  ].filter((d) => d.value > 0);
  const totalTasks =
    (data.taskStatus?.completed || 0) +
    (data.taskStatus?.inProgress || 0) +
    (data.taskStatus?.review || 0) +
    (data.taskStatus?.todo || 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow text-ink-muted">Company Overview</p>
          <h1 className="mt-1.5 text-[36px] font-semibold leading-tight tracking-tight text-ink">
            {greeting()}, {firstName}.
          </h1>
          <p className="mt-1 text-[17px] text-ink-secondary">
            Company performance across your workspaces.
          </p>
        </div>
        <Link href="/dashboard/workspaces" className="btn-primary shrink-0 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> New workspace
        </Link>
      </div>

      {/* Company stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Members" value={stats.activeMembers} icon={Users} color="accent" />
        <StatCard
          title="Workspaces"
          value={stats.workspaces}
          icon={FolderGit2}
          color="slate"
        />
        <StatCard title="Open Tasks" value={stats.openTasks} icon={CircleDot} color="slate" />
        <StatCard
          title="Completed Tasks"
          value={stats.completedTasks}
          icon={CheckCircle2}
          color="success"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-7 lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-[17px] font-semibold text-ink">Workspace Activity</h3>
            <p className="mt-0.5 text-sm text-ink-muted">Events across all company workspaces</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyActivity || []}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke={MUTED} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={MUTED} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: CHART_GRID }} />
                <Line
                  type="monotone"
                  dataKey="events"
                  stroke={ACCENT}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: ACCENT }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-7">
          <div className="mb-4">
            <h3 className="text-[17px] font-semibold text-ink">Task Status</h3>
            <p className="mt-0.5 text-sm text-ink-muted">Company-wide distribution</p>
          </div>
          <div className="relative h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData.length ? donutData : [{ name: 'No tasks', value: 1, color: '#24252d' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={64}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold text-ink">{totalTasks}</span>
              <span className="text-[11px] uppercase tracking-widest text-ink-muted">Tasks</span>
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-line pt-4">
            {donutData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-ink-secondary">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-medium text-ink">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity + Workspace overview */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <SectionCard title="Recent Activity" subtitle="Latest events across the company">
            {data.recentActivities.length === 0 ? (
              <p className="px-5 py-10 text-center text-[15px] text-ink-muted">
                No activity yet. Actions in your workspaces will appear here.
              </p>
            ) : (
              <ActivityTable activities={data.recentActivities} />
            )}
          </SectionCard>
        </div>

        <div className="xl:col-span-3">
          <SectionCard title="Workspace Overview" subtitle="Your company workspaces at a glance">
            <div className="hidden grid-cols-[minmax(0,1fr)_80px_80px_70px_100px] gap-x-3 border-b border-line px-5 py-2.5 md:grid">
              <span className="eyebrow text-ink-muted">Workspace</span>
              <span className="eyebrow text-ink-muted">Members</span>
              <span className="eyebrow text-ink-muted">Projects</span>
              <span className="eyebrow text-ink-muted">Tasks</span>
              <span className="eyebrow text-ink-muted">Created</span>
            </div>
            {data.workspaceRows.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-base font-medium text-ink-secondary">No workspaces yet</p>
                <p className="mx-auto mt-1 max-w-sm text-[15px] text-ink-muted">
                  Create your first workspace to start organizing your team’s work.
                </p>
                <Link href="/dashboard/workspaces" className="btn-primary mt-4">
                  <Plus className="h-4 w-4" /> Create workspace
                </Link>
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {data.workspaceRows.map((w) => (
                  <li
                    key={w.id}
                    className="grid grid-cols-2 gap-x-3 gap-y-1 border-b border-line px-5 py-3 last:border-b-0 hover:bg-hover/50 md:grid-cols-[minmax(0,1fr)_80px_80px_70px_100px] md:items-center"
                  >
                    <span className="truncate text-[15px] font-medium text-ink">{w.name}</span>
                    <span className="text-[15px] text-ink-secondary md:text-center">{w.members}</span>
                    <span className="text-[15px] text-ink-secondary md:text-center">{w.projects}</span>
                    <span className="text-[15px] text-ink-secondary md:text-center">{w.tasks}</span>
                    <span className="text-sm text-ink-muted md:text-right">
                      {formatTime(w.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
