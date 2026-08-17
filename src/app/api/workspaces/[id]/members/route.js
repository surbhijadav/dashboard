import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import WorkspaceMember from '@/lib/models/WorkspaceMember';
import ActivityLog from '@/lib/models/ActivityLog';
import { getAuthUser, authorizeWorkspaceAccess } from '@/lib/auth';

// GET members (accepted + pending invitations) of THIS workspace
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

    const members = await WorkspaceMember.find({ workspace: workspaceId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ members });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT accept or decline YOUR OWN pending legacy membership invitation to this workspace
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: workspaceId } = await params;
    const { action } = await req.json();

    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Own membership regardless of status — no workspace access required yet
    const membership = await WorkspaceMember.findOne({
      workspace: workspaceId,
      user: authUser.userId,
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'No invitation found for this workspace.' },
        { status: 404 }
      );
    }

    if (membership.status === 'accepted') {
      return NextResponse.json({ error: 'Invitation already accepted.' }, { status: 400 });
    }

    const workspace = membership.workspace;

    if (action === 'accept') {
      membership.status = 'accepted';
      await membership.save();

      await ActivityLog.create({
        workspace: workspaceId,
        user: authUser.userId,
        action: 'Invitation Accepted',
        details: `Accepted invitation to join this workspace as ${membership.role}`,
      });

      return NextResponse.json({ message: 'Invitation accepted', status: 'accepted' });
    }

    await WorkspaceMember.deleteOne({ _id: membership._id });

    await ActivityLog.create({
      workspace: workspaceId,
      user: authUser.userId,
      action: 'Invitation Declined',
      details: 'Declined invitation to join this workspace',
    });

    return NextResponse.json({ message: 'Invitation declined', status: 'declined' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE revoke a user's access (or pending invitation) from THIS workspace
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: workspaceId } = await params;
    const { searchParams } = new URL(req.url);
    const userIdToRemove = searchParams.get('userId');

    if (!userIdToRemove) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const access = await authorizeWorkspaceAccess(workspaceId, authUser.userId, 'admin');
    if (!access.ok) {
      return NextResponse.json(
        { error: 'Access Denied: Only workspace admins can remove members.' },
        { status: access.status }
      );
    }

    const removed = await WorkspaceMember.findOneAndDelete({
      workspace: workspaceId,
      user: userIdToRemove,
    });

    if (removed) {
      await ActivityLog.create({
        workspace: workspaceId,
        user: authUser.userId,
        action: removed.status === 'pending' ? 'Invitation Revoked' : 'Workspace Access Revoked',
        details:
          removed.status === 'pending'
            ? `Pending invitation revoked for user ID ${userIdToRemove}`
            : `Revoked workspace access for user ID ${userIdToRemove}`,
      });
    }

    return NextResponse.json({ message: 'Member access removed from workspace' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
