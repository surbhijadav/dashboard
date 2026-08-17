import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Invitation from '@/lib/models/Invitation';
import User from '@/lib/models/User';
import { getAuthUser, authorizeWorkspaceAccess } from '@/lib/auth';
import { createInvitation } from '@/lib/invitationService';
import { rateLimit, clientIp } from '@/lib/rateLimit';

// GET invitations for a workspace (workspace/company admins only, tenant-scoped)
export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const access = await authorizeWorkspaceAccess(workspaceId, authUser.userId, 'admin');
    if (!access.ok) {
      return NextResponse.json({ error: 'Access Denied: You cannot manage this workspace.' }, { status: access.status });
    }

    // Lazily flip overdue pending invitations to expired
    await Invitation.updateMany(
      { workspace: workspaceId, status: 'pending', expiresAt: { $lt: new Date() } },
      { status: 'expired' }
    );

    const invitations = await Invitation.find({ workspace: workspaceId })
      .populate('invitedBy', 'name email')
      .populate('workspace', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv._id,
        email: inv.email,
        invitedName: inv.invitedName,
        role: inv.role,
        status: inv.status,
        invitedBy: inv.invitedBy?.name || 'Administrator',
        sent: inv.createdAt,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST create + email a workspace invitation
export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!rateLimit(`inv:create:${authUser.userId}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many invitations sent. Please try again later.' }, { status: 429 });
    }

    const user = await User.findById(authUser.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { email, name, role, workspaceId } = await req.json();
    if (!workspaceId || !email) {
      return NextResponse.json({ error: 'Email and workspace are required' }, { status: 400 });
    }

    const result = await createInvitation({ authUser, workspaceId, email, name, role });
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status });
    }

    return NextResponse.json(
      {
        message: 'Invitation sent',
        invitation: {
          id: result.invitation._id,
          email: result.invitation.email,
          role: result.invitation.role,
          status: result.invitation.status,
          expiresAt: result.invitation.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create Invitation Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
