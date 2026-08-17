import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { comparePassword, signToken, getAccessibleWorkspaces, isCompanyAdmin } from '@/lib/auth';

export async function POST(req) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Please enter email and password' }, { status: 400 });
    }

    const user = await User.findOne({ email }).select('+password').populate('company');
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { workspaces, invitations } = await getAccessibleWorkspaces(user);

    let currentWorkspaceId = user.currentWorkspace;
    const isValidWorkspace = workspaces.some(
      (w) => w.id.toString() === currentWorkspaceId?.toString()
    );

    if (!isValidWorkspace && workspaces.length > 0) {
      currentWorkspaceId = workspaces[0].id;
      user.currentWorkspace = currentWorkspaceId;
      await user.save();
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      message: 'Logged in successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        companyName: user.company?.name || 'Company',
        companyRole: isCompanyAdmin(user, user.company) ? 'admin' : 'employee',
        currentWorkspace: currentWorkspaceId,
      },
      workspaces,
      invitations,
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
