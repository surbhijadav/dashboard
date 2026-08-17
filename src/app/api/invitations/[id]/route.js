import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Invitation from '@/lib/models/Invitation';
import User from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';
import { acceptInvitationForUser, logEvent } from '@/lib/invitationService';

// Authenticated accept/decline of YOUR OWN invitation (addressed to your email),
// used by the pending-invitations panel on the employee dashboard.
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { action } = await req.json();

    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const invitation = await Invitation.findById(id);
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    const user = await User.findById(authUser.userId);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address.' },
        { status: 403 }
      );
    }

    if (action === 'accept') {
      const result = await acceptInvitationForUser(invitation, user);
      if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: result.error.status });
      }
      return NextResponse.json(result);
    }

    const flipped = await Invitation.findOneAndUpdate(
      { _id: invitation._id, status: 'pending' },
      { status: 'declined' }
    );
    if (!flipped) {
      return NextResponse.json({ error: 'This invitation is no longer valid.' }, { status: 410 });
    }

    await logEvent(
      'Invitation Declined',
      invitation.workspace,
      user._id,
      `${user.email} declined the invitation to join this workspace`
    );

    return NextResponse.json({ message: 'Invitation declined', status: 'declined' });
  } catch (error) {
    console.error('Invitation Action Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
