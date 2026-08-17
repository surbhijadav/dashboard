import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Invitation from '@/lib/models/Invitation';
import { getAuthUser, authorizeWorkspaceAccess } from '@/lib/auth';
import { logEvent } from '@/lib/invitationService';

// POST cancel a pending invitation — the emailed link stops working immediately.
export async function POST(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const invitation = await Invitation.findById(id);
    if (!invitation) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });

    const access = await authorizeWorkspaceAccess(invitation.workspace, authUser.userId, 'admin');
    if (!access.ok) {
      return NextResponse.json({ error: 'Access Denied.' }, { status: access.status });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `This invitation is ${invitation.status} and cannot be cancelled.` },
        { status: 400 }
      );
    }

    const flipped = await Invitation.findOneAndUpdate(
      { _id: invitation._id, status: 'pending' },
      { status: 'cancelled' }
    );

    if (flipped) {
      await logEvent(
        'Invitation Cancelled',
        invitation.workspace,
        authUser.userId,
        `Invitation for ${invitation.email} cancelled — link deactivated`
      );
    }

    return NextResponse.json({ message: 'Invitation cancelled' });
  } catch (error) {
    console.error('Cancel Invitation Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
