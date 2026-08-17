import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/lib/models/Task';
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
        { error: 'Access Denied: You do not have permission to access tasks in this workspace.' },
        { status: 403 }
      );
    }

    const tasks = await Task.find({ workspace: workspaceId })
      .populate('project', 'name')
      .populate('assignee', 'name email avatar')
      .sort({ createdAt: -1 });

    return NextResponse.json({ tasks });
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

    const { title, description, project, priority, status, dueDate, assignee } = await req.json();

    if (!title) return NextResponse.json({ error: 'Task title is required' }, { status: 400 });

    const task = await Task.create({
      workspace: workspaceId,
      project: project || null,
      title,
      description: description || '',
      priority: priority || 'medium',
      status: status || 'todo',
      dueDate: dueDate || null,
      assignee: assignee || authUser.userId,
    });

    await ActivityLog.create({
      workspace: workspaceId,
      user: authUser.userId,
      action: 'Task Created',
      details: `Task "${title}" was created`,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('project', 'name')
      .populate('assignee', 'name email avatar');

    return NextResponse.json({ task: populatedTask }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
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

    const { taskId, status, priority, title, description } = await req.json();

    if (!taskId) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });

    const updateFields = {};
    if (status) updateFields.status = status;
    if (priority) updateFields.priority = priority;
    if (title) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;

    const task = await Task.findOneAndUpdate(
      { _id: taskId, workspace: workspaceId },
      updateFields,
      { new: true }
    ).populate('project', 'name').populate('assignee', 'name email avatar');

    if (!task) return NextResponse.json({ error: 'Task not found in this workspace' }, { status: 404 });

    await ActivityLog.create({
      workspace: workspaceId,
      user: authUser.userId,
      action: 'Task Updated',
      details: `Task "${task.title}" status changed to ${status || task.status}`,
    });

    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
