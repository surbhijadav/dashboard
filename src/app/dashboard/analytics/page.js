'use client';

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { BarChart3, TrendingUp, DollarSign, Award, Target, Zap } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

export default function AnalyticsPage() {
  const { currentWorkspace } = useWorkspace();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/workspaces/${currentWorkspace.id}/analytics`);
        const data = await res.json();
        setAnalytics(data);
      } catch (e) {
        console.error('Analytics error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [currentWorkspace?.id]);

  const metrics = analytics?.metrics || {};
  const chartData = analytics?.monthlyAnalytics || [];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow text-ink-muted">Analytics</p>
          <h1 className="mt-1.5 text-[36px] font-semibold leading-tight tracking-tight text-ink">
            {currentWorkspace?.name || 'Workspace'} Analytics
          </h1>
          <p className="mt-1 text-[17px] text-ink-secondary">
            Productivity metrics, task velocity, and budget distribution for this workspace.
          </p>
        </div>
      </div>

      {/* Analytics Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 glass-card rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10 text-success-text border border-success/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium">Workspace Productivity</div>
            <div className="text-2xl font-semibold text-white">{metrics.completionRate || 0}%</div>
            <div className="text-xs text-success-text font-medium mt-0.5">Completion rate</div>
          </div>
        </div>

        <div className="p-6 glass-card rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent/10 text-accent-bright border border-accent/20">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium">Completed Tasks</div>
            <div className="text-2xl font-semibold text-white">{metrics.completedTasks || 0}</div>
            <div className="text-xs text-accent-bright font-medium mt-0.5">Out of {metrics.totalTasks || 0} total</div>
          </div>
        </div>

        <div className="p-6 glass-card rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent/10 text-accent-bright border border-accent/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium">Allocated Budget</div>
            <div className="text-2xl font-semibold text-white">${(metrics.totalBudget || 0).toLocaleString()}</div>
            <div className="text-xs text-accent-bright font-medium mt-0.5">{metrics.activeProjects || 0} Active Projects</div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Budget Allocation Bar Chart */}
        <div className="p-7 glass-card rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Revenue & Budget Growth</h3>
            <span className="text-sm text-slate-400">Monthly breakdown</span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#24252d" vertical={false} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#15161d',
                    borderColor: '#24252d',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f5f5f7',
                  }}
                  cursor={{ fill: 'rgba(94, 106, 210, 0.08)' }}
                />
                <Bar dataKey="revenue" fill="#5e6ad2" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Velocity Line Chart */}
        <div className="p-7 glass-card rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Task Completion Throughput</h3>
            <span className="text-sm text-slate-400">Velocity Trend</span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#24252d" vertical={false} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#15161d',
                    borderColor: '#24252d',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f5f5f7',
                  }}
                />
                <Line type="monotone" dataKey="tasks" stroke="#98a0e8" strokeWidth={2} dot={{ r: 3, fill: '#98a0e8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
