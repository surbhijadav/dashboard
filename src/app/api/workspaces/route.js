import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Workspace from '@/lib/models/Workspace';
import WorkspaceMember from '@/lib/models/WorkspaceMember';
import ActivityLog from '@/lib/models/ActivityLog';
import { getAuthUser, slugify } from '@/lib/auth';

// GET workspaces available to current logged-in user
export async function GET() {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const memberships = await WorkspaceMember.find({ user: authUser.userId }).populate('workspace');
    const workspaces = memberships
      .filter((m) => m.workspace !== null)
      .map((m) => ({
        id: m.workspace._id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        description: m.workspace.description,
        role: m.role,
        createdAt: m.workspace.createdAt,
      }));

    return NextResponse.json({ workspaces });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create a new workspace inside the user's Company
export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(authUser.userId);
    if (!user || !user.company) {
      return NextResponse.json({ error: 'Company account required to create workspaces' }, { status: 400 });
    }

    const { name, description } = await req.json();
    if (!name) return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });

    const baseSlug = slugify(name);
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    // Create Workspace inside the Company
    const workspace = await Workspace.create({
      company: user.company,
      name,
      slug,
      description: description || '',
      owner: authUser.userId,
    });

    // Grant Admin permission to creator for this specific workspace
    await WorkspaceMember.create({
      workspace: workspace._id,
      company: user.company,
      user: authUser.userId,
      role: 'admin',
    });

    await User.findByIdAndUpdate(authUser.userId, { currentWorkspace: workspace._id });

    await ActivityLog.create({
      workspace: workspace._id,
      user: authUser.userId,
      action: 'Workspace Created',
      details: `New workspace "${name}" was created`,
    });

    return NextResponse.json(
      {
        workspace: {
          id: workspace._id,
          name: workspace.name,
          slug: workspace.slug,
          role: 'admin',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
