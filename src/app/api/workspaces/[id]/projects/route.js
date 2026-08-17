import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/lib/models/Project';
import ActivityLog from '@/lib/models/ActivityLog';
import { getAuthUser, verifyWorkspaceMemberAccess } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: workspaceId } = await params;

    const membership = await verifyWorkspaceMemberAccess(workspaceId, authUser.userId);
    if (!membership) {
      return NextResponse.json(
        { error: 'Access Denied: You do not have permission to access this workspace.' },
        { status: 403 }
      );
    }

    const projects = await Project.find({ workspace: workspaceId }).sort({ createdAt: -1 });

    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: workspaceId } = await params;

    const membership = await verifyWorkspaceMemberAccess(workspaceId, authUser.userId);
    if (!membership || (membership.role !== 'admin' && membership.role !== 'editor')) {
      return NextResponse.json(
        { error: 'Access Denied: Insufficient workspace permissions.' },
        { status: 403 }
      );
    }

    const { name, description, budget, status, dueDate } = await req.json();

    if (!name) return NextResponse.json({ error: 'Project name is required' }, { status: 400 });

    const project = await Project.create({
      workspace: workspaceId,
      name,
      description: description || '',
      budget: Number(budget) || 0,
      status: status || 'active',
      dueDate: dueDate || null,
      createdBy: authUser.userId,
    });

    await ActivityLog.create({
      workspace: workspaceId,
      user: authUser.userId,
      action: 'Project Created',
      details: `Project "${name}" was created`,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
