'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({ title, value, change, trend, icon: Icon, color }) {
  const colorMap = {
    blue: 'bg-accent/10 text-accent-bright',
    emerald: 'bg-success/10 text-success-text',
    amber: 'bg-warning/10 text-warning-text',
    slate: 'bg-white/5 text-ink-secondary',
  };

  const selectedColor = colorMap[color] || colorMap.blue;

  return (
    <div className="rounded-xl border border-line bg-surface p-5 transition-colors duration-200 hover:border-line-bright">
      <div className="mb-4 flex items-center justify-between">
        <span className="eyebrow text-ink-muted">{title}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${selectedColor}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <h3 className="text-2xl font-semibold tracking-tight text-ink">{value}</h3>
        {change && (
          <div
            className={`flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
              trend === 'up' ? 'bg-success/10 text-success-text' : 'bg-danger/10 text-danger-text'
            }`}
          >
            {trend === 'up' ? (
              <ArrowUpRight className="mr-0.5 h-3 w-3" />
            ) : (
              <ArrowDownRight className="mr-0.5 h-3 w-3" />
            )}
            {change}
          </div>
        )}
      </div>
    </div>
  );
}
