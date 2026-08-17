import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Company from '@/lib/models/Company';
import Workspace from '@/lib/models/Workspace';
import WorkspaceMember from '@/lib/models/WorkspaceMember';
import Project from '@/lib/models/Project';
import Task from '@/lib/models/Task';
import ActivityLog from '@/lib/models/ActivityLog';
import { getAuthUser, isCompanyAdmin } from '@/lib/auth';

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Builds the last 6 months (inclusive of current) with a 0-default per key
function lastSixMonths() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: monthKey(d), label: d.toLocaleDateString('en-US', { month: 'short' }), events: 0 });
  }
  return months;
}

export async function GET() {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(authUser.userId).populate('company');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const company = user.company;
    const admin = isCompanyAdmin(user, company);

    if (admin) {
      // ===== ADMIN: company-wide overview across ALL company workspaces =====
      const workspaces = company
        ? await Workspace.find({ company: company._id }).sort({ createdAt: 1 })
        : [];
      const ids = workspaces.map((w) => w._id);

      const [memberRows, projectRows, taskRows] = ids.length
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
              { $group: { _id: '$workspace', status: { $push: '$status' } } },
            ]),
          ])
        : [[], [], []];

      const memberMap = new Map(memberRows.map((r) => [r._id.toString(), r.count]));
      const projectMap = new Map(projectRows.map((r) => [r._id.toString(), r.count]));

      let openTasks = 0;
      let completedTasks = 0;
      const taskStatus = { completed: 0, inProgress: 0, todo: 0, review: 0 };
      const taskCountByWorkspace = new Map();

      for (const row of taskRows) {
        let count = 0;
        for (const s of row.status) {
          count++;
          if (s === 'completed') {
            completedTasks++;
            taskStatus.completed++;
          } else {
            openTasks++;
            if (s === 'in_progress') taskStatus.inProgress++;
            else if (s === 'in_review') taskStatus.review++;
            else taskStatus.todo++;
          }
        }
        taskCountByWorkspace.set(row._id.toString(), count);
      }

      const activeMembers = ids.length
        ? await WorkspaceMember.distinct('user', { workspace: { $in: ids }, status: 'accepted' })
        : [];

      // Real activity volume per month (last 6 months)
      const months = lastSixMonths();
      const firstMonth = new Date(`${months[0].key}-01T00:00:00.000Z`);
      const activityAgg = ids.length
        ? await ActivityLog.aggregate([
            { $match: { workspace: { $in: ids }, createdAt: { $gte: firstMonth } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
          ])
        : [];
      const activityMap = new Map(activityAgg.map((r) => [r._id, r.count]));
      for (const m of months) m.events = activityMap.get(m.key) || 0;

      const recentActivities = ids.length
        ? await ActivityLog.find({ workspace: { $in: ids } })
            .populate('user', 'name')
            .populate('workspace', 'name')
            .sort({ createdAt: -1 })
            .limit(8)
        : [];

      return NextResponse.json({
        companyRole: 'admin',
        stats: {
          activeMembers: activeMembers.length,
          workspaces: workspaces.length,
          openTasks,
          completedTasks,
        },
        monthlyActivity: months.map(({ label, events }) => ({ month: label, events })),
        taskStatus,
        recentActivities,
        workspaceRows: workspaces.map((w) => ({
          id: w._id,
          name: w.name,
          members: memberMap.get(w._id.toString()) || 0,
          projects: projectMap.get(w._id.toString()) || 0,
          tasks: taskCountByWorkspace.get(w._id.toString()) || 0,
          createdAt: w.createdAt,
        })),
      });
    }

    // ===== EMPLOYEE: personal overview across ASSIGNED workspaces only =====
    const memberships = await WorkspaceMember.find({ user: user._id, status: 'accepted' }).populate(
      'workspace'
    );
    const myWorkspaces = memberships
      .filter((m) => m.workspace)
      .map((m) => ({
        id: m.workspace._id,
        name: m.workspace.name,
        description: m.workspace.description,
        role: m.role,
        createdAt: m.workspace.createdAt,
      }));
    const ids = myWorkspaces.map((w) => w.id);

    const [projectRows, tasks] = ids.length
      ? await Promise.all([
          Project.aggregate([
            { $match: { workspace: { $in: ids } } },
            { $group: { _id: '$workspace', count: { $sum: 1 } } },
          ]),
          Task.find({ workspace: { $in: ids } })
            .populate('project', 'name')
            .populate('workspace', 'name')
            .sort({ createdAt: -1 })
            .limit(50),
        ])
      : [[], []];

    const projectMap = new Map(projectRows.map((r) => [r._id.toString(), r.count]));

    const myTasks = tasks.filter((t) => t.assignee?.toString() === user._id.toString()).slice(0, 10);

    // Pending invitations
    const pending = await WorkspaceMember.find({ user: user._id, status: 'pending' }).populate(
      'workspace'
    );
    const invitations = pending
      .filter((m) => m.workspace)
      .map((m) => ({
        id: m._id,
        workspaceId: m.workspace._id,
        name: m.workspace.name,
        role: m.role,
        invitedAt: m.createdAt,
      }));

    const recentActivities = ids.length
      ? await ActivityLog.find({ workspace: { $in: ids } })
          .populate('user', 'name')
          .populate('workspace', 'name')
          .sort({ createdAt: -1 })
          .limit(8)
      : [];

    return NextResponse.json({
      companyRole: 'employee',
      myWorkspaces: myWorkspaces.map((w) => ({
        ...w,
        projectCount: projectMap.get(w.id.toString()) || 0,
      })),
      myTasks,
      invitations,
      recentActivities,
    });
  } catch (error) {
    console.error('Overview Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
