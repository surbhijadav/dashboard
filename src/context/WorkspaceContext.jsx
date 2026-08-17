'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchAuthAndWorkspaces = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setWorkspaces(data.workspaces || []);
        setInvitations(data.invitations || []);

        const current = (data.workspaces || []).find(
          (w) => w.id.toString() === data.user.currentWorkspace?.toString()
        );
        setCurrentWorkspace(current || (data.workspaces || [])[0] || null);
      } else {
        setUser(null);
        setWorkspaces([]);
        setInvitations([]);
        setCurrentWorkspace(null);
        if (pathname.startsWith('/dashboard')) {
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Failed to fetch auth/workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setUser(data.user);
          setWorkspaces(data.workspaces || []);
          setInvitations(data.invitations || []);

          const current = (data.workspaces || []).find(
            (w) => w.id.toString() === data.user.currentWorkspace?.toString()
          );
          setCurrentWorkspace(current || (data.workspaces || [])[0] || null);
        } else {
          setUser(null);
          setWorkspaces([]);
          setInvitations([]);
          setCurrentWorkspace(null);
          if (pathname.startsWith('/dashboard')) {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Failed to fetch auth/workspaces:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchWorkspace = async (workspaceId) => {
    const target = workspaces.find((w) => w.id === workspaceId);
    if (!target) return;

    setCurrentWorkspace(target);

    try {
      await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentWorkspace: workspaceId }),
      });
    } catch (e) {
      console.error('Error updating active workspace:', e);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setWorkspaces([]);
      setInvitations([]);
      setCurrentWorkspace(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isCompanyAdmin = user?.companyRole === 'admin';

  return (
    <WorkspaceContext.Provider
      value={{
        user,
        setUser,
        workspaces,
        setWorkspaces,
        invitations,
        setInvitations,
        currentWorkspace,
        setCurrentWorkspace,
        switchWorkspace,
        refreshWorkspaces: fetchAuthAndWorkspaces,
        logout,
        loading,
        isCompanyAdmin,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
