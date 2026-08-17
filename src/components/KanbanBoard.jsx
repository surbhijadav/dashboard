'use client';

import React from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { CheckCircle2, Clock, AlertCircle, Circle, ArrowRight } from 'lucide-react';

export default function KanbanBoard({ tasks = [], onStatusChange }) {
  const columns = [
    { key: 'todo', title: 'To Do', dot: 'bg-ink-muted' },
    { key: 'in_progress', title: 'In Progress', dot: 'bg-accent' },
    { key: 'in_review', title: 'In Review', dot: 'bg-accent-bright' },
    { key: 'completed', title: 'Completed', dot: 'bg-success' },
  ];

  const priorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-1.5 py-0.5 text-xs font-semibold rounded-md bg-danger/10 text-danger-text border border-danger/25">Urgent</span>;
      case 'high':
        return <span className="px-1.5 py-0.5 text-xs font-semibold rounded-md bg-warning/10 text-warning-text border border-warning/25">High</span>;
      case 'medium':
        return <span className="px-1.5 py-0.5 text-xs font-semibold rounded-md bg-accent/10 text-accent-bright border border-accent/25">Medium</span>;
      default:
        return <span className="px-1.5 py-0.5 text-xs font-semibold rounded-md bg-hover text-ink-muted border border-line">Low</span>;
    }
  };

  const getNextStatus = (current) => {
    if (current === 'todo') return 'in_progress';
    if (current === 'in_progress') return 'in_review';
    if (current === 'in_review') return 'completed';
    return 'todo';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);

        return (
          <div
            key={col.key}
            className="p-5 glass-card rounded-xl flex flex-col h-full min-h-[450px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <h4 className="text-[17px] font-semibold text-ink">{col.title}</h4>
              </div>
              <span className="px-2 py-0.5 text-[13px] font-semibold rounded-md bg-hover text-ink-secondary">
                {colTasks.length}
              </span>
            </div>

            {/* Task Cards */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {colTasks.length === 0 ? (
                <div className="py-8 text-center text-sm text-ink-muted border border-dashed border-line rounded-lg">
                  No tasks in {col.title.toLowerCase()}
                </div>
              ) : (
                colTasks.map((task) => (
                  <div
                    key={task._id}
                    className="p-4 rounded-lg border border-line bg-elevated hover:border-line-bright transition-colors duration-150 group space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-[15px] font-semibold text-ink leading-snug">
                        {task.title}
                      </h5>
                      {priorityBadge(task.priority)}
                    </div>

                    {task.description && (
                      <p className="text-[13px] text-ink-muted line-clamp-2 leading-normal">
                        {task.description}
                      </p>
                    )}

                    {task.project?.name && (
                      <div className="text-xs text-ink-secondary font-medium px-2 py-0.5 rounded-md bg-hover border border-line inline-block">
                        {task.project.name}
                      </div>
                    )}

                    <div className="pt-2 border-t border-line flex items-center justify-between text-[13px] text-ink-muted">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md border border-line bg-elevated flex items-center justify-center text-ink-secondary text-[9px] font-semibold">
                          {task.assignee?.name ? task.assignee.name.charAt(0) : 'U'}
                        </div>
                        <span className="truncate max-w-[80px]">{task.assignee?.name || 'Assigned'}</span>
                      </div>

                      {/* Quick Move Action */}
                      <button
                        onClick={() => onStatusChange(task._id, getNextStatus(task.status))}
                        className="p-1 rounded-md hover:bg-hover text-ink-muted hover:text-accent-bright transition-colors flex items-center gap-1 text-xs"
                        title="Move to next status"
                      >
                        <span>Move</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
