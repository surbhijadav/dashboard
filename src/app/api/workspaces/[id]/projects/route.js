import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/lib/models/Project';
import ActivityLog from '@/lib/models/ActivityLog';
import { getAuthUser, authorizeWorkspaceAccess } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: workspaceId } = await params;

    const access = await authorizeWorkspaceAccess(workspaceId, authUser.userId, 'viewer');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
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

    const access = await authorizeWorkspaceAccess(workspaceId, authUser.userId, 'editor');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
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
