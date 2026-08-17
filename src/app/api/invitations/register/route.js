import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { getAuthUser, hashPassword, signToken } from '@/lib/auth';
import { findInvitationByToken, classifyInvitation, acceptInvitationForUser, logEvent } from '@/lib/invitationService';
import { rateLimit, clientIp } from '@/lib/rateLimit';

// CASE B: create an account from a valid invitation, then accept it.
// The invitation email is the source of truth — the user never picks a
// company or workspace, and email cannot be changed.
export async function POST(req) {
  try {
    await dbConnect();

    const ip = clientIp(req);
    if (!rateLimit(`inv:register:${ip}`, 10, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const authUser = await getAuthUser();
    if (authUser) {
      return NextResponse.json(
        { error: 'You are already signed in. Please accept the invitation instead.' },
        { status: 400 }
      );
    }

    const { token, name, password } = await req.json();
    if (!name || !password) {
      return NextResponse.json({ error: 'Please provide your name and a password.' }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const query = findInvitationByToken(token);
    const invitation = query ? await query : null;
    const invalid = await classifyInvitation(invitation);
    if (invalid) {
      return NextResponse.json({ error: invalid.error }, { status: invalid.status });
    }

    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in to accept the invitation.' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(String(password));
    const user = await User.create({
      name: String(name).trim(),
      email: invitation.email,
      password: hashedPassword,
      company: invitation.company,
      companyRole: 'employee',
    });

    const result = await acceptInvitationForUser(invitation, user);
    if (result.error) {
      await User.deleteOne({ _id: user._id });
      return NextResponse.json({ error: result.error.message }, { status: result.error.status });
    }

    await logEvent(
      'Account Created via Invitation',
      invitation.workspace,
      user._id,
      `${user.email} created an account and joined "${result.workspace?.name || 'a workspace'}"`
    );

    // Establish the normal session (same JWT cookie architecture as login)
    const jwt = signToken({ userId: user._id.toString(), email: user.email, name: user.name });
    const response = NextResponse.json(result, { status: 201 });
    response.cookies.set('token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Invitation Register Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
