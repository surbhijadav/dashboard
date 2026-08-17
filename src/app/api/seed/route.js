import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Company from '@/lib/models/Company';
import Workspace from '@/lib/models/Workspace';
import WorkspaceMember from '@/lib/models/WorkspaceMember';
import Project from '@/lib/models/Project';
import Task from '@/lib/models/Task';
import ActivityLog from '@/lib/models/ActivityLog';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    await dbConnect();
    const hashedPassword = await hashPassword('password123');

    // 1. Create Company 1
    let admin = await User.findOne({ email: 'admin@company1.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Sarah Connor (Company Admin)',
        email: 'admin@company1.com',
        password: hashedPassword,
      });
    }

    let company1 = await Company.findOne({ name: 'Acme Technologies' });
    if (!company1) {
      company1 = await Company.create({
        name: 'Acme Technologies',
        slug: 'acme-technologies',
        owner: admin._id,
      });
    }

    admin.company = company1._id;

    // 2. Create Workspace 1: "Public Mobile App"
    let wsMobile = await Workspace.findOne({ name: 'Workspace Alpha - Mobile App', company: company1._id });
    if (!wsMobile) {
      wsMobile = await Workspace.create({
        company: company1._id,
        name: 'Workspace Alpha - Mobile App',
        slug: 'ws-alpha-mobile-app',
        description: 'Customer facing mobile application codebase',
        owner: admin._id,
      });
    }

    // 3. Create Workspace 2: "Confidential Security Infrastructure"
    let wsSecurity = await Workspace.findOne({ name: 'Workspace Beta - Security Vault', company: company1._id });
    if (!wsSecurity) {
      wsSecurity = await Workspace.create({
        company: company1._id,
        name: 'Workspace Beta - Security Vault',
        slug: 'ws-beta-security-vault',
        description: 'Restricted administrative security vault workspace',
        owner: admin._id,
      });
    }

    // 4. Grant Admin access to BOTH Workspaces
    await WorkspaceMember.findOneAndUpdate(
      { workspace: wsMobile._id, user: admin._id },
      { workspace: wsMobile._id, company: company1._id, user: admin._id, role: 'admin' },
      { upsert: true }
    );

    await WorkspaceMember.findOneAndUpdate(
      { workspace: wsSecurity._id, user: admin._id },
      { workspace: wsSecurity._id, company: company1._id, user: admin._id, role: 'admin' },
      { upsert: true }
    );

    admin.currentWorkspace = wsMobile._id;
    await admin.save();

    // 5. Create Restricted User "Alex (Developer)"
    let alex = await User.findOne({ email: 'alex@company1.com' });
    if (!alex) {
      alex = await User.create({
        name: 'Alex Rivera (Developer)',
        email: 'alex@company1.com',
        password: hashedPassword,
        company: company1._id,
        currentWorkspace: wsMobile._id,
      });
    }

    // Grant Alex access ONLY to Workspace Alpha (Mobile App)! NOT Workspace Beta!
    await WorkspaceMember.findOneAndUpdate(
      { workspace: wsMobile._id, user: alex._id },
      { workspace: wsMobile._id, company: company1._id, user: alex._id, role: 'editor' },
      { upsert: true }
    );

    // Remove Alex from Workspace Beta if present
    await WorkspaceMember.deleteOne({ workspace: wsSecurity._id, user: alex._id });

    // 6. Populate Workspace Alpha Tasks
    const projAlpha = await Project.create({
      workspace: wsMobile._id,
      name: 'iOS & Android App Rollout',
      budget: 85000,
      status: 'active',
      createdBy: admin._id,
    });

    await Task.create([
      {
        workspace: wsMobile._id,
        project: projAlpha._id,
        title: 'Design Mobile Splash Screen',
        description: 'Create dark mode asset graphics in Figma.',
        status: 'in_progress',
        priority: 'high',
        assignee: alex._id,
      },
      {
        workspace: wsMobile._id,
        project: projAlpha._id,
        title: 'Setup Push Notifications',
        description: 'Integrate Firebase cloud messaging SDK.',
        status: 'todo',
        priority: 'medium',
        assignee: alex._id,
      },
    ]);

    // 7. Populate Workspace Beta (Confidential Vault) Tasks
    const projBeta = await Project.create({
      workspace: wsSecurity._id,
      name: 'Zero-Trust HSM Encryption Keys',
      budget: 250000,
      status: 'active',
      createdBy: admin._id,
    });

    await Task.create([
      {
        workspace: wsSecurity._id,
        project: projBeta._id,
        title: 'Rotate AWS Root Key Pair',
        description: 'Confidential security task. Only admins can see this.',
        status: 'completed',
        priority: 'urgent',
        assignee: admin._id,
      },
    ]);

    return NextResponse.json({
      message: 'Per-workspace invitation & permission system initialized!',
      adminAccount: {
        email: 'admin@company1.com',
        password: 'password123',
        accessibleWorkspaces: ['Workspace Alpha - Mobile App', 'Workspace Beta - Security Vault'],
      },
      restrictedMemberAccount: {
        email: 'alex@company1.com',
        password: 'password123',
        accessibleWorkspaces: ['Workspace Alpha - Mobile App ONLY (Workspace Beta is hidden & forbidden)'],
      },
    });
  } catch (error) {
    console.error('Seed Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
