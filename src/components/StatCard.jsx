'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({ title, value, change, trend, icon: Icon, color }) {
  const colorMap = {
    accent: 'bg-accent/10 text-accent-bright',
    success: 'bg-success/10 text-success-text',
    warning: 'bg-warning/10 text-warning-text',
    slate: 'bg-hover text-ink-secondary',
  };

  const selectedColor = colorMap[color] || colorMap.blue;

  return (
    <div className="rounded-xl border border-line bg-surface p-7 transition-colors duration-200 hover:border-line-bright">
      <div className="mb-4 flex items-center justify-between">
        <span className="eyebrow text-ink-muted">{title}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${selectedColor}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <h3 className="text-[32px] font-semibold tracking-tight text-ink">{value}</h3>
        {change && (
          <div
            className={`flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${
              trend === 'up' ? 'bg-success/10 text-success-text' : 'bg-danger/10 text-danger-text'
            }`}
          >
            {trend === 'up' ? (
              <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
            )}
            {change}
          </div>
        )}
      </div>
    </div>
  );
}
