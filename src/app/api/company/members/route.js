import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Company from '@/lib/models/Company';
import WorkspaceMember from '@/lib/models/WorkspaceMember';
import Workspace from '@/lib/models/Workspace';
import { getAuthUser, isCompanyAdmin } from '@/lib/auth';

// GET all members of the user's COMPANY (company admins only)
export async function GET() {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(authUser.userId).populate('company');
    if (!user || !user.company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (!isCompanyAdmin(user, user.company)) {
      return NextResponse.json(
        { error: 'Access Denied: Only company admins can view company members.' },
        { status: 403 }
      );
    }

    // Strictly scoped to the admin's own company
    const [users, companyWorkspaces] = await Promise.all([
      User.find({ company: user.company._id }).sort({ createdAt: 1 }),
      Workspace.find({ company: user.company._id }).select('_id name'),
    ]);

    const workspaceIds = companyWorkspaces.map((w) => w._id);
    const memberships = workspaceIds.length
      ? await WorkspaceMember.find({ workspace: { $in: workspaceIds } }).populate('workspace', 'name')
      : [];

    const membershipsByUser = new Map();
    for (const m of memberships) {
      if (!m.workspace) continue;
      const key = m.user.toString();
      if (!membershipsByUser.has(key)) membershipsByUser.set(key, []);
      membershipsByUser.get(key).push({
        id: m.workspace._id,
        name: m.workspace.name,
        role: m.role,
        status: m.status,
      });
    }

    const members = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      companyRole: isCompanyAdmin(u, user.company) ? 'admin' : 'employee',
      joined: u.createdAt,
      workspaces: (membershipsByUser.get(u._id.toString()) || []).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }));

    return NextResponse.json({ members });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
