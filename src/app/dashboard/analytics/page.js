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
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
          <BarChart3 className="w-4 h-4" /> Workspace Analytics & Reports
        </div>
        <h1 className="text-2xl font-extrabold text-white">
          {currentWorkspace?.name || 'Workspace'} Analytics Breakdown
        </h1>
        <p className="text-xs text-slate-400">
          In-depth productivity metrics, project velocity, and budget distribution
        </p>
      </div>

      {/* Analytics Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 glass-card rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Workspace Productivity</div>
            <div className="text-2xl font-extrabold text-white">{metrics.completionRate || 88}%</div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">High Performance</div>
          </div>
        </div>

        <div className="p-5 glass-card rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Completed Tasks</div>
            <div className="text-2xl font-extrabold text-white">{metrics.completedTasks || 0}</div>
            <div className="text-[11px] text-blue-400 font-semibold mt-0.5">Out of {metrics.totalTasks || 0} Total</div>
          </div>
        </div>

        <div className="p-5 glass-card rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent/10 text-accent-bright border border-accent/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Allocated Budget</div>
            <div className="text-2xl font-semibold text-white">${(metrics.totalBudget || 0).toLocaleString()}</div>
            <div className="text-[11px] text-accent-bright font-medium mt-0.5">{metrics.activeProjects || 0} Active Projects</div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Budget Allocation Bar Chart */}
        <div className="p-6 glass-card rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Revenue & Budget Growth</h3>
            <span className="text-xs text-slate-400">Monthly breakdown</span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Velocity Line Chart */}
        <div className="p-6 glass-card rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Task Completion Throughput</h3>
            <span className="text-xs text-slate-400">Velocity Trend</span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Line type="monotone" dataKey="tasks" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
