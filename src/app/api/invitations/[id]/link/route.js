import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Invitation from '@/lib/models/Invitation';
import { getAuthUser, authorizeWorkspaceAccess } from '@/lib/auth';
import { rotateInvitationToken } from '@/lib/invitationService';
import { buildInvitationUrl } from '@/lib/invitationToken';
import { rateLimit } from '@/lib/rateLimit';

// POST regenerate + return a fresh acceptance link for a pending invitation.
// Rotating keeps a single active token per invitation. Admins only,
// tenant-scoped. The URL is returned once and never persisted in raw form.
export async function POST(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!rateLimit(`inv:link:${authUser.userId}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { id } = await params;
    const invitation = await Invitation.findById(id);
    if (!invitation) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });

    const access = await authorizeWorkspaceAccess(invitation.workspace, authUser.userId, 'admin');
    if (!access.ok) {
      return NextResponse.json({ error: 'Access Denied.' }, { status: access.status });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending invitations can have an active link. Use resend instead.' },
        { status: 400 }
      );
    }

    const token = await rotateInvitationToken(invitation);
    return NextResponse.json({ url: buildInvitationUrl(token), expiresAt: invitation.expiresAt });
  } catch (error) {
    console.error('Invitation Link Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
