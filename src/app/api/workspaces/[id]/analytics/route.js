import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/lib/models/Project';
import Task from '@/lib/models/Task';
import WorkspaceMember from '@/lib/models/WorkspaceMember';
import ActivityLog from '@/lib/models/ActivityLog';
import { getAuthUser, authorizeWorkspaceAccess } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: workspaceId } = await params;

    // Per-workspace permission check (company admin or accepted member)
    const access = await authorizeWorkspaceAccess(workspaceId, authUser.userId, 'viewer');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const projects = await Project.find({ workspace: workspaceId });
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);

    const tasks = await Task.find({ workspace: workspaceId });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
    const todoTasks = tasks.filter((t) => t.status === 'todo').length;
    const reviewTasks = tasks.filter((t) => t.status === 'in_review').length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const memberCount = await WorkspaceMember.countDocuments({ workspace: workspaceId });

    const recentActivities = await ActivityLog.find({ workspace: workspaceId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(8);

    const monthlyAnalytics = [
      { month: 'Jan', revenue: Math.round(totalBudget * 0.15), tasks: Math.round(totalTasks * 0.1) },
      { month: 'Feb', revenue: Math.round(totalBudget * 0.22), tasks: Math.round(totalTasks * 0.2) },
      { month: 'Mar', revenue: Math.round(totalBudget * 0.35), tasks: Math.round(totalTasks * 0.4) },
      { month: 'Apr', revenue: Math.round(totalBudget * 0.55), tasks: Math.round(totalTasks * 0.6) },
      { month: 'May', revenue: Math.round(totalBudget * 0.78), tasks: Math.round(totalTasks * 0.8) },
      { month: 'Jun', revenue: totalBudget, tasks: totalTasks },
    ];

    return NextResponse.json({
      metrics: {
        totalBudget,
        totalProjects,
        activeProjects,
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        reviewTasks,
        completionRate,
        memberCount,
      },
      monthlyAnalytics,
      recentActivities,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
