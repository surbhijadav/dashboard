import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Company from '@/lib/models/Company';
import Workspace from '@/lib/models/Workspace';
import WorkspaceMember from '@/lib/models/WorkspaceMember';
import ActivityLog from '@/lib/models/ActivityLog';
import { hashPassword, signToken, slugify } from '@/lib/auth';

export async function POST(req) {
  try {
    await dbConnect();
    const { name, email, password, companyName } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Please provide all required fields' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    // 1. Create User
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // 2. Create Company
    const compName = companyName && companyName.trim() ? companyName.trim() : `${name}'s Company`;
    const companySlug = `${slugify(compName)}-${Math.random().toString(36).substring(2, 6)}`;

    const company = await Company.create({
      name: compName,
      slug: companySlug,
      owner: user._id,
    });

    user.company = company._id;

    // 3. Create Default Initial Workspace within Company
    const workspaceName = 'Main Workspace';
    const workspaceSlug = `${slugify(workspaceName)}-${Math.random().toString(36).substring(2, 6)}`;

    const workspace = await Workspace.create({
      company: company._id,
      name: workspaceName,
      slug: workspaceSlug,
      description: 'Primary project workspace for ' + compName,
      owner: user._id,
    });

    // 4. Assign Admin Role to User for this Workspace
    await WorkspaceMember.create({
      workspace: workspace._id,
      company: company._id,
      user: user._id,
      role: 'admin',
    });

    user.currentWorkspace = workspace._id;
    await user.save();

    await ActivityLog.create({
      workspace: workspace._id,
      user: user._id,
      action: 'Company & Workspace Created',
      details: `Company ${compName} registered with initial workspace "${workspaceName}"`,
    });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json(
      {
        message: 'Company account registered successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          company: company._id,
          currentWorkspace: workspace._id,
        },
        workspace: {
          id: workspace._id,
          name: workspace.name,
          role: 'admin',
        },
      },
      { status: 201 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
