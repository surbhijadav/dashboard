import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import WorkspaceMember from '@/lib/models/WorkspaceMember';
import Workspace from '@/lib/models/Workspace';
import User from '@/lib/models/User';
import ActivityLog from '@/lib/models/ActivityLog';
import { getAuthUser, hashPassword, verifyWorkspaceMemberAccess } from '@/lib/auth';

// GET members granted access to THIS specific workspace
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: workspaceId } = await params;

    const membership = await verifyWorkspaceMemberAccess(workspaceId, authUser.userId);
    if (!membership) {
      return NextResponse.json(
        { error: 'Access Denied: You do not have permission to view this workspace\'s members.' },
        { status: 403 }
      );
    }

    const members = await WorkspaceMember.find({ workspace: workspaceId })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 });

    return NextResponse.json({ members });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST grant/invite a user permission to THIS specific workspace
export async function POST(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: workspaceId } = await params;

    const membership = await verifyWorkspaceMemberAccess(workspaceId, authUser.userId);
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access Denied: Only workspace admins can invite users to this workspace.' },
        { status: 403 }
      );
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    const { email, name, role } = await req.json();
    if (!email) return NextResponse.json({ error: 'User email is required' }, { status: 400 });

    let targetUser = await User.findOne({ email });
    if (!targetUser) {
      const hashedPassword = await hashPassword('password123');
      targetUser = await User.create({
        name: name || email.split('@')[0],
        email,
        password: hashedPassword,
        company: workspace.company,
        currentWorkspace: workspaceId,
      });
    }

    const existingAccess = await WorkspaceMember.findOne({ workspace: workspaceId, user: targetUser._id });
    if (existingAccess) {
      return NextResponse.json({ error: 'User already has access to this workspace' }, { status: 400 });
    }

    const newMember = await WorkspaceMember.create({
      workspace: workspaceId,
      company: workspace.company,
      user: targetUser._id,
      role: role || 'editor',
      status: 'accepted',
    });

    await ActivityLog.create({
      workspace: workspaceId,
      user: authUser.userId,
      action: 'Workspace Permission Granted',
      details: `${targetUser.name} (${targetUser.email}) granted access to "${workspace.name}" as ${role || 'editor'}`,
    });

    const populatedMember = await WorkspaceMember.findById(newMember._id).populate('user', 'name email avatar');

    return NextResponse.json({ member: populatedMember }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE revoke a user's access from THIS specific workspace
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: workspaceId } = await params;
    const { searchParams } = new URL(req.url);
    const userIdToRemove = searchParams.get('userId');

    if (!userIdToRemove) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const membership = await verifyWorkspaceMemberAccess(workspaceId, authUser.userId);
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access Denied: Only workspace admins can remove members.' },
        { status: 403 }
      );
    }

    await WorkspaceMember.deleteOne({ workspace: workspaceId, user: userIdToRemove });

    await ActivityLog.create({
      workspace: workspaceId,
      user: authUser.userId,
      action: 'Workspace Access Revoked',
      details: `Revoked workspace access for user ID ${userIdToRemove}`,
    });

    return NextResponse.json({ message: 'Member access removed from workspace' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
