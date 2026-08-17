import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser, hashPassword, signToken } from '@/lib/auth';
import { findInvitationByToken, classifyInvitation, logEvent } from '@/lib/invitationService';
import { rateLimit, clientIp } from '@/lib/rateLimit';

// POST set a new password for the EXISTING account matching a valid invitation,
// then establish a normal session. Possession of the invitation token proves
// control of the invited email — the standard account-claim trust model.
export async function POST(req) {
  try {
    await dbConnect();

    const ip = clientIp(req);
    if (!rateLimit(`inv:setpass:${ip}`, 10, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const authUser = await getAuthUser();
    if (authUser) {
      return NextResponse.json({ error: 'You are already signed in.' }, { status: 400 });
    }

    const { token, password } = await req.json();
    if (!password || String(password).length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const query = findInvitationByToken(token);
    const invitation = query ? await query : null;
    const invalid = await classifyInvitation(invitation);
    if (invalid) {
      return NextResponse.json({ error: invalid.error }, { status: invalid.status });
    }

    const user = await User.findOne({ email: invitation.email }).select('+password');
    if (!user) {
      return NextResponse.json(
        { error: 'No account exists for this email yet — use "Create your account" instead.' },
        { status: 400 }
      );
    }

    user.password = await hashPassword(String(password));
    await user.save();

    await logEvent(
      'Password Set via Invitation',
      invitation.workspace,
      user._id,
      `${user.email} set a new password using an invitation link`
    );

    const jwt = signToken({ userId: user._id.toString(), email: user.email, name: user.name });
    const response = NextResponse.json({
      message: 'Password updated. You are now signed in.',
    });
    response.cookies.set('token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Set Password via Invitation Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
