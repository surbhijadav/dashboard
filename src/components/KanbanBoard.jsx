'use client';

import React from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { CheckCircle2, Clock, AlertCircle, Circle, ArrowRight } from 'lucide-react';

export default function KanbanBoard({ tasks = [], onStatusChange }) {
  const columns = [
    { key: 'todo', title: 'To Do', color: 'border-slate-600 bg-slate-900/40 text-slate-300' },
    { key: 'in_progress', title: 'In Progress', color: 'border-blue-500 bg-blue-950/20 text-blue-400' },
    { key: 'in_review', title: 'Under Review', color: 'border-purple-500 bg-purple-950/20 text-purple-400' },
    { key: 'completed', title: 'Completed', color: 'border-emerald-500 bg-emerald-950/20 text-emerald-400' },
  ];

  const priorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Medium</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">Low</span>;
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
            className="p-4 glass-card rounded-2xl border border-slate-800 flex flex-col h-full min-h-[450px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.key === 'completed' ? 'bg-emerald-500' : col.key === 'in_progress' ? 'bg-blue-500' : col.key === 'in_review' ? 'bg-purple-500' : 'bg-slate-500'}`} />
                <h4 className="text-sm font-bold text-white">{col.title}</h4>
              </div>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-300">
                {colTasks.length}
              </span>
            </div>

            {/* Task Cards */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {colTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800/80 rounded-xl">
                  No tasks in {col.title.toLowerCase()}
                </div>
              ) : (
                colTasks.map((task) => (
                  <div
                    key={task._id}
                    className="p-3.5 glass-panel rounded-xl border border-slate-800 hover:border-slate-700 transition group space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition leading-snug">
                        {task.title}
                      </h5>
                      {priorityBadge(task.priority)}
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-normal">
                        {task.description}
                      </p>
                    )}

                    {task.project?.name && (
                      <div className="text-[10px] text-purple-400 font-medium px-2 py-0.5 rounded bg-purple-500/10 inline-block">
                        📁 {task.project.name}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold">
                          {task.assignee?.name ? task.assignee.name.charAt(0) : 'U'}
                        </div>
                        <span className="truncate max-w-[80px]">{task.assignee?.name || 'Assigned'}</span>
                      </div>

                      {/* Quick Move Action */}
                      <button
                        onClick={() => onStatusChange(task._id, getNextStatus(task.status))}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition flex items-center gap-1 text-[10px]"
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
