'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function ActivityPage() {
  const { user } = useWorkspace();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/activity');
        const data = await res.json();
        if (!cancelled) {
          if (res.ok) setActivities(data.activities || []);
          else setError(data.error || 'Failed to load activity');
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load activity');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow text-ink-muted">My Activity</p>
        <h1 className="mt-1.5 text-[36px] font-semibold leading-tight tracking-tight text-ink">
          Activity
        </h1>
        <p className="mt-1 text-[17px] text-ink-secondary">
          Recent events across the workspaces you have access to.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
          <p className="text-[15px] font-medium text-ink-secondary">{error}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="hidden grid-cols-[minmax(0,1fr)_160px_140px] gap-x-3 border-b border-line px-4 py-2.5 md:grid">
            <span className="eyebrow text-ink-muted">Event</span>
            <span className="eyebrow text-ink-muted">Workspace</span>
            <span className="eyebrow text-ink-muted text-right">When</span>
          </div>

          {loading ? (
            <div role="status" aria-label="Loading activity" className="px-4 py-8">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
                  <div className="h-8 w-8 animate-pulse rounded-md bg-hover" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-40 animate-pulse rounded bg-hover" />
                    <div className="h-2.5 w-64 animate-pulse rounded bg-hover" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <p className="px-5 py-12 text-center text-[15px] text-ink-muted">
              No activity yet. Actions in your workspaces will appear here.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {activities.map((a) => (
                <li
                  key={a._id}
                  className="grid grid-cols-1 gap-x-3 gap-y-1 border-b border-line px-6 py-4 last:border-b-0 hover:bg-hover/50 md:grid-cols-[minmax(0,1fr)_160px_140px] md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-[11px] font-medium text-ink-secondary">
                      {a.user?.name ? a.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-ink">
                        {a.user?.name || 'User'} · {a.action}
                      </p>
                      <p className="truncate text-sm text-ink-muted">{a.details}</p>
                    </div>
                  </div>
                  <span className="truncate text-sm text-ink-secondary">{a.workspace?.name}</span>
                  <span className="text-sm text-ink-muted md:text-right">
                    {formatDateTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
