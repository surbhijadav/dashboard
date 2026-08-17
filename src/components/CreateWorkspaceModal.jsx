'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Building2, X, Plus } from 'lucide-react';

export default function CreateWorkspaceModal({ isOpen, onClose, onCreated }) {
  const { refreshWorkspaces, switchWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create workspace');
      }

      await refreshWorkspaces();
      if (data.workspace?.id) {
        switchWorkspace(data.workspace.id);
      }
      setName('');
      setDescription('');
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'h-10 w-full rounded-lg border border-line bg-app px-3 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/15';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-line bg-elevated p-6 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)] animate-dropdown">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent-bright">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Create workspace</h2>
              <p className="text-[13px] text-ink-secondary">A dedicated space inside your company</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] text-danger-text">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ws-name" className="mb-1.5 block text-xs font-medium text-ink-secondary">
              Workspace name
            </label>
            <input
              id="ws-name"
              type="text"
              required
              placeholder="e.g. Marketing, Development, HR"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="ws-description" className="mb-1.5 block text-xs font-medium text-ink-secondary">
              Description <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <textarea
              id="ws-description"
              rows={3}
              placeholder="What is this workspace for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-lg border border-line bg-app px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              <Plus className="h-4 w-4" />
              {loading ? 'Creating…' : 'Create workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
