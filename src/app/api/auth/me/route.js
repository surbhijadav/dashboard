import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import WorkspaceMember from '@/lib/models/WorkspaceMember';
import Workspace from '@/lib/models/Workspace';
import Company from '@/lib/models/Company';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(authUser.userId).populate('company');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return only workspaces this user has been explicitly invited/added to
    const memberships = await WorkspaceMember.find({ user: user._id }).populate('workspace');
    const workspaces = memberships
      .filter((m) => m.workspace !== null)
      .map((m) => ({
        id: m.workspace._id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        description: m.workspace.description,
        role: m.role,
      }));

    let currentWorkspaceId = user.currentWorkspace;
    const isValidWorkspace = workspaces.some((w) => w.id.toString() === currentWorkspaceId?.toString());

    if (!isValidWorkspace && workspaces.length > 0) {
      currentWorkspaceId = workspaces[0].id;
      user.currentWorkspace = currentWorkspaceId;
      await user.save();
    }

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        companyName: user.company?.name || 'Company',
        currentWorkspace: currentWorkspaceId,
      },
      workspaces,
    });
  } catch (error) {
    console.error('Auth Me Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
