import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Invitation from '@/lib/models/Invitation';
import Workspace from '@/lib/models/Workspace';
import Company from '@/lib/models/Company';
import User from '@/lib/models/User';
import { getAuthUser, authorizeWorkspaceAccess } from '@/lib/auth';
import { rotateInvitationToken, logEvent } from '@/lib/invitationService';
import { sendInvitationEmail } from '@/lib/emailService';
import { buildInvitationUrl } from '@/lib/invitationToken';

// POST resend an invitation: rotates the token (old link stops working),
// resets the expiration and emails the recipient again.
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

    if (!['pending', 'expired'].includes(invitation.status)) {
      return NextResponse.json(
        { error: `This invitation is ${invitation.status} and cannot be resent.` },
        { status: 400 }
      );
    }

    const token = await rotateInvitationToken(invitation);

    const [workspace, company, inviter] = await Promise.all([
      Workspace.findById(invitation.workspace),
      Company.findById(invitation.company),
      User.findById(authUser.userId),
    ]);

    await sendInvitationEmail({
      to: invitation.email,
      inviterName: inviter?.name || 'Your administrator',
      companyName: company?.name || 'the company',
      workspaceName: workspace?.name || 'the workspace',
      role: invitation.role,
      acceptUrl: buildInvitationUrl(token),
      expiresAt: invitation.expiresAt,
    });

    await logEvent(
      'Invitation Resent',
      invitation.workspace,
      authUser.userId,
      `Invitation for ${invitation.email} resent with a new link`
    );

    return NextResponse.json({
      message: `Invitation resent to ${invitation.email}`,
      invitation: {
        id: invitation._id,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Resend Invitation Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
