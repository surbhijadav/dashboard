import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Company from '@/lib/models/Company';
import Workspace from '@/lib/models/Workspace';
import WorkspaceMember from '@/lib/models/WorkspaceMember';
import ActivityLog from '@/lib/models/ActivityLog';
import { getAuthUser, isCompanyAdmin } from '@/lib/auth';

// GET activity across the user's authorized scope
// ADMIN  -> every workspace of their company
// EMPLOYEE -> only workspaces they are accepted members of
export async function GET() {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(authUser.userId).populate('company');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let workspaceIds;
    if (isCompanyAdmin(user, user.company) && user.company) {
      const workspaces = await Workspace.find({ company: user.company._id }).select('_id');
      workspaceIds = workspaces.map((w) => w._id);
    } else {
      const rows = await WorkspaceMember.find({ user: user._id, status: 'accepted' }).select('workspace');
      workspaceIds = rows.map((r) => r.workspace);
    }

    const activities = workspaceIds.length
      ? await ActivityLog.find({ workspace: { $in: workspaceIds } })
          .populate('user', 'name')
          .populate('workspace', 'name')
          .sort({ createdAt: -1 })
          .limit(60)
      : [];

    return NextResponse.json({ activities });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
