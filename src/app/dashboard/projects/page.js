'use client';

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import KanbanBoard from '@/components/KanbanBoard';
import CreateTaskModal from '@/components/CreateTaskModal';
import CreateProjectModal from '@/components/CreateProjectModal';
import { KanbanSquare, Plus, FolderKanban, Filter } from 'lucide-react';

export default function ProjectsPage() {
  const { currentWorkspace } = useWorkspace();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('all');

  const fetchData = async () => {
    if (!currentWorkspace?.id) return;
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`/api/workspaces/${currentWorkspace.id}/tasks`),
        fetch(`/api/workspaces/${currentWorkspace.id}/projects`),
      ]);

      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();

      setTasks(tasksData.tasks || []);
      setProjects(projectsData.projects || []);
    } catch (e) {
      console.error('Failed to load tasks/projects:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          fetch(`/api/workspaces/${currentWorkspace.id}/tasks`),
          fetch(`/api/workspaces/${currentWorkspace.id}/projects`),
        ]);

        const tasksData = await tasksRes.json();
        const projectsData = await projectsRes.json();

        if (!cancelled) {
          setTasks(tasksData.tasks || []);
          setProjects(projectsData.projects || []);
        }
      } catch (e) {
        console.error('Failed to load tasks/projects:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentWorkspace?.id]);

  const handleStatusChange = async (taskId, newStatus) => {
    // Optimistic UI Update
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await fetch(`/api/workspaces/${currentWorkspace.id}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
      fetchData(); // Rollback on error
    }
  };

  const filteredTasks = selectedProject === 'all'
    ? tasks
    : tasks.filter((t) => t.project?._id === selectedProject);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-7 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-ink-muted text-xs font-medium uppercase tracking-[0.08em] mb-1">
            <KanbanSquare className="w-3.5 h-3.5" /> Workspace Projects & Tasks
          </div>
          <h1 className="text-[34px] font-semibold tracking-tight text-ink">
            {currentWorkspace?.name || 'Workspace'} Kanban Board
          </h1>
          <p className="mt-1 text-[17px] text-ink-secondary">
            Manage projects, move tasks across status workflows in real-time
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setProjectModalOpen(true)} className="btn-secondary">
            <FolderKanban className="h-4 w-4" /> New Project
          </button>
          <button onClick={() => setTaskModalOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 glass-card p-3 rounded-2xl border border-slate-800">
        <Filter className="w-4 h-4 text-slate-400 ml-2" />
        <span className="text-sm font-semibold text-slate-300">Filter by Project:</span>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-3 py-1.5 glass-input rounded-xl text-sm bg-slate-900 focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Projects ({tasks.length} tasks)</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Kanban Board Container */}
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">
          Loading workspace task board...
        </div>
      ) : (
        <KanbanBoard tasks={filteredTasks} onStatusChange={handleStatusChange} />
      )}

      <CreateTaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        projects={projects}
        onTaskCreated={fetchData}
      />
      <CreateProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onProjectCreated={fetchData}
      />
    </div>
  );
}
