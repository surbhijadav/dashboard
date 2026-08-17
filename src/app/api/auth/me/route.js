import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Company from '@/lib/models/Company';
import { getAuthUser, getAccessibleWorkspaces, isCompanyAdmin } from '@/lib/auth';

async function buildSession(userId) {
  const user = await User.findById(userId).populate('company');
  if (!user) return null;

  const company = user.company;
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

  if (!workspaces.length) {
    currentWorkspaceId = null;
  }

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      companyName: company?.name || 'Company',
      companyRole: isCompanyAdmin(user, company) ? 'admin' : 'employee',
      currentWorkspace: currentWorkspaceId,
    },
    workspaces,
    invitations,
  };
}

export async function GET() {
  try {
    await dbConnect();
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await buildSession(authUser.userId);
    if (!session) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Auth Me Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Persist the user's selected workspace (validated server-side against accessible workspaces)
export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(authUser.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { currentWorkspace } = await req.json();
    if (!currentWorkspace) {
      return NextResponse.json({ error: 'currentWorkspace is required' }, { status: 400 });
    }

    const { workspaces } = await getAccessibleWorkspaces(user);
    const allowed = workspaces.some((w) => w.id.toString() === currentWorkspace.toString());
    if (!allowed) {
      return NextResponse.json(
        { error: 'Access Denied: You do not have access to this workspace.' },
        { status: 403 }
      );
    }

    user.currentWorkspace = currentWorkspace;
    await user.save();

    return NextResponse.json({ currentWorkspace: user.currentWorkspace });
  } catch (error) {
    console.error('Auth Me POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
