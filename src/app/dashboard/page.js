'use client';

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import StatCard from '@/components/StatCard';
import CreateTaskModal from '@/components/CreateTaskModal';
import CreateProjectModal from '@/components/CreateProjectModal';
import {
  DollarSign,
  FolderKanban,
  CheckCircle2,
  Users,
  Plus,
  TrendingUp,
  Activity,
  Sparkles,
  Building2,
  FolderGit2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function DashboardPage() {
  const { user, currentWorkspace } = useWorkspace();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    if (!currentWorkspace?.id) return;
    try {
      const [analyticsRes, projectsRes] = await Promise.all([
        fetch(`/api/workspaces/${currentWorkspace.id}/analytics`),
        fetch(`/api/workspaces/${currentWorkspace.id}/projects`),
      ]);

      const analyticsData = await analyticsRes.json();
      const projectsData = await projectsRes.json();

      setData(analyticsData);
      setProjects(projectsData.projects || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [analyticsRes, projectsRes] = await Promise.all([
          fetch(`/api/workspaces/${currentWorkspace.id}/analytics`),
          fetch(`/api/workspaces/${currentWorkspace.id}/projects`),
        ]);

        const analyticsData = await analyticsRes.json();
        const projectsData = await projectsRes.json();

        if (!cancelled) {
          setData(analyticsData);
          setProjects(projectsData.projects || []);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentWorkspace?.id]);

  const metrics = data?.metrics || {
    totalBudget: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0,
    memberCount: 1,
  };

  const chartData = data?.monthlyAnalytics || [];
  const activities = data?.recentActivities || [];

  const pieData = [
    { name: 'Completed', value: metrics.completedTasks || 1, color: '#22c55e' },
    { name: 'In Progress', value: metrics.inProgressTasks || 1, color: '#3b82f6' },
    { name: 'To Do', value: metrics.todoTasks || 1, color: '#64748b' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-1.5 text-ink-muted">
            <Building2 className="h-3.5 w-3.5" /> {user?.companyName || 'Company'} · Overview
          </p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-tight text-ink">
            {currentWorkspace?.name || 'Select Workspace'}
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {currentWorkspace?.description || 'Project repository & task dashboard.'} · Role:{' '}
            <span className="font-medium capitalize text-ink">{currentWorkspace?.role || 'member'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setProjectModalOpen(true)} className="btn-secondary">
            <Plus className="h-4 w-4" /> New Project
          </button>
          <button onClick={() => setTaskModalOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Task
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Workspace Budget"
          value={`$${(metrics.totalBudget || 0).toLocaleString()}`}
          change="+18.4%"
          trend="up"
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Active Projects"
          value={`${metrics.activeProjects} / ${metrics.totalProjects}`}
          change="+2 new"
          trend="up"
          icon={FolderKanban}
          color="blue"
        />
        <StatCard
          title="Task Completion"
          value={`${metrics.completionRate}%`}
          change={`${metrics.completedTasks} done`}
          trend="up"
          icon={CheckCircle2}
          color="blue"
        />
        <StatCard
          title="Workspace Members"
          value={metrics.memberCount}
          change="Assigned"
          trend="up"
          icon={Users}
          color="slate"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 glass-card rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Workspace Performance & Budget</h3>
              <p className="text-xs text-slate-400">Monthly throughput for {currentWorkspace?.name}</p>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Loading workspace analytics...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151d2a',
                      borderColor: '#202938',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Task Breakdown Pie Chart */}
        <div className="p-6 glass-card rounded-3xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Task Distribution</h3>
            <p className="text-xs text-slate-400">Current status in this workspace</p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151d2a',
                    borderColor: '#202938',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f8fafc',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <div className="text-xl font-bold text-white">{metrics.totalTasks}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">Tasks</div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-semibold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Timeline & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 glass-card rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold text-white">Recent Workspace Activity</h3>
            </div>
            <span className="text-xs text-slate-400">Live Audit</span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No activity logged for this workspace yet.
              </div>
            ) : (
              activities.map((act) => (
                <div
                  key={act._id}
                  className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start gap-3 text-xs"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0">
                    {act.user?.name ? act.user.name.charAt(0) : 'U'}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{act.action}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-0.5 truncate">{act.details}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 glass-card rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-accent-bright" />
              <h3 className="text-base font-semibold text-white">Workspace Projects</h3>
            </div>
            <button
              onClick={() => setProjectModalOpen(true)}
              className="text-xs font-medium text-accent-bright hover:underline"
            >
              + Add Project
            </button>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {projects.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No projects created yet in {currentWorkspace?.name}.
              </div>
            ) : (
              projects.map((proj) => (
                <div
                  key={proj._id}
                  className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h5 className="font-bold text-white">{proj.name}</h5>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{proj.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-400">${(proj.budget || 0).toLocaleString()}</div>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/10 text-blue-400 capitalize">
                      {proj.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <CreateTaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        projects={projects}
        onTaskCreated={fetchDashboardData}
      />
      <CreateProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onProjectCreated={fetchDashboardData}
      />
    </div>
  );
}
