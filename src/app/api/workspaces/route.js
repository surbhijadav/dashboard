import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Workspace from '@/lib/models/Workspace';
import WorkspaceMember from '@/lib/models/WorkspaceMember';
import Project from '@/lib/models/Project';
import Task from '@/lib/models/Task';
import ActivityLog from '@/lib/models/ActivityLog';
import { getAuthUser, slugify, getAccessibleWorkspaces, isCompanyAdmin } from '@/lib/auth';

// GET workspaces available to the current user, with usage counts
export async function GET() {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(authUser.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { workspaces } = await getAccessibleWorkspaces(user);

    // Enrich with member / project / task counts
    const ids = workspaces.map((w) => w.id);
    const [memberCounts, projectCounts, taskCounts] = ids.length
      ? await Promise.all([
          WorkspaceMember.aggregate([
            { $match: { workspace: { $in: ids }, status: 'accepted' } },
            { $group: { _id: '$workspace', count: { $sum: 1 } } },
          ]),
          Project.aggregate([
            { $match: { workspace: { $in: ids } } },
            { $group: { _id: '$workspace', count: { $sum: 1 } } },
          ]),
          Task.aggregate([
            { $match: { workspace: { $in: ids } } },
            { $group: { _id: '$workspace', count: { $sum: 1 } } },
          ]),
        ])
      : [[], [], []];

    const toMap = (rows) => new Map(rows.map((r) => [r._id.toString(), r.count]));
    const memberMap = toMap(memberCounts);
    const projectMap = toMap(projectCounts);
    const taskMap = toMap(taskCounts);

    const enriched = workspaces.map((w) => ({
      ...w,
      memberCount: memberMap.get(w.id.toString()) || 0,
      projectCount: projectMap.get(w.id.toString()) || 0,
      taskCount: taskMap.get(w.id.toString()) || 0,
    }));

    return NextResponse.json({ workspaces: enriched });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create a new workspace inside the user's Company (company admins only)
export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(authUser.userId).populate('company');
    if (!user || !user.company) {
      return NextResponse.json({ error: 'Company account required to create workspaces' }, { status: 400 });
    }

    // Only company admins may create workspaces
    if (!isCompanyAdmin(user, user.company)) {
      return NextResponse.json(
        { error: 'Access Denied: Only company admins can create workspaces.' },
        { status: 403 }
      );
    }

    const { name, description } = await req.json();
    if (!name) return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });

    const baseSlug = slugify(name);
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    // Create Workspace inside the Company
    const workspace = await Workspace.create({
      company: user.company._id,
      name,
      slug,
      description: description || '',
      owner: authUser.userId,
    });

    // Grant Admin permission to creator for this specific workspace
    await WorkspaceMember.create({
      workspace: workspace._id,
      company: user.company._id,
      user: authUser.userId,
      role: 'admin',
      status: 'accepted',
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
