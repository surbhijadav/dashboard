import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Invitation from '@/lib/models/Invitation';
import Company from '@/lib/models/Company';
import { getAuthUser } from '@/lib/auth';
import { findInvitationByToken, classifyInvitation, acceptInvitationForUser } from '@/lib/invitationService';
import { rateLimit, clientIp } from '@/lib/rateLimit';

// PUBLIC: validate a token from an email link. Never grants access, never
// authenticates anyone — it only returns a preview of the invitation.
export async function GET(req) {
  try {
    await dbConnect();

    const ip = clientIp(req);
    if (!rateLimit(`inv:validate:${ip}`, 30, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const query = findInvitationByToken(token);
    const invitation = query ? await query.populate('workspace', 'name').populate('invitedBy', 'name') : null;

    const invalid = await classifyInvitation(invitation);
    if (invalid) {
      return NextResponse.json({ state: 'invalid', error: invalid.error }, { status: invalid.status });
    }

    const [company, existingUser] = await Promise.all([
      Company.findById(invitation.company),
      User.exists({ email: invitation.email }),
    ]);

    const authUser = await getAuthUser();

    return NextResponse.json({
      state: 'valid',
      authenticated: Boolean(authUser),
      authEmail: authUser?.email || null,
      hasAccount: Boolean(existingUser),
      invitation: {
        companyName: company?.name || 'Company',
        workspaceName: invitation.workspace?.name || 'Workspace',
        workspaceId: invitation.workspace?._id,
        role: invitation.role,
        email: invitation.email,
        invitedBy: invitation.invitedBy?.name || 'Administrator',
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Validate Invitation Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

// AUTHENTICATED acceptance (CASE A). Requires an existing session whose email
// matches the invitation email.
export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: 'Please sign in to accept this invitation.' },
        { status: 401 }
      );
    }

    const ip = clientIp(req);
    if (!rateLimit(`inv:accept:${ip}`, 15, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const { token } = await req.json();
    const query = findInvitationByToken(token);
    const invitation = query ? await query : null;

    const user = await User.findById(authUser.userId);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await acceptInvitationForUser(invitation, user);
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Accept Invitation Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
