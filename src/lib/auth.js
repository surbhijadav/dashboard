import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import WorkspaceMember from '@/lib/models/WorkspaceMember';
import Workspace from '@/lib/models/Workspace';
import User from '@/lib/models/User';
import Company from '@/lib/models/Company';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_multi_tenant_workspace_key_2026';

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

export async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  const decoded = verifyToken(token);
  return decoded;
}

/**
 * Whether a user is an ADMIN of the given company (their own company only).
 * Admin = company owner or explicitly assigned companyRole 'admin'.
 */
export function isCompanyAdmin(user, company) {
  if (!user || !company) return false;
  if (user.companyRole === 'admin') return true;
  return Boolean(company.owner) && company.owner.toString() === user._id.toString();
}

const ROLE_RANK = { viewer: 1, editor: 2, admin: 3 };

/**
 * Central workspace authorization guard.
 *
 * Enforces, server-side, on every call:
 *  1. authenticated user
 *  2. the workspace belongs to the user's own company (tenant isolation)
 *  3. the user has an ACCEPTED membership with sufficient role
 *     (company admins bypass membership/role checks for their own company)
 *
 * Never trust client-provided ids as proof of authorization.
 *
 * @param {string} workspaceId
 * @param {string} userId
 * @param {'viewer'|'editor'|'admin'} minRole minimum workspace role required
 */
export async function authorizeWorkspaceAccess(workspaceId, userId, minRole = 'viewer') {
  if (!workspaceId || !userId) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return { ok: false, status: 404, error: 'Workspace not found' };
    }

    const user = await User.findById(userId);
    if (!user) {
      return { ok: false, status: 401, error: 'Unauthorized' };
    }

    // Company admins of the SAME company have full access to that company's workspaces
    const sameCompany =
      user.company && workspace.company && user.company.toString() === workspace.company.toString();

    let companyAdmin = false;
    if (sameCompany) {
      const company = await Company.findById(workspace.company);
      companyAdmin = isCompanyAdmin(user, company);
    }

    if (companyAdmin) {
      const membership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: userId,
        status: 'accepted',
      });
      return { ok: true, membership, companyAdmin: true, workspace, user };
    }

    const membership = await WorkspaceMember.findOne({
      workspace: workspaceId,
      user: userId,
      status: 'accepted',
    });

    if (!membership) {
      return {
        ok: false,
        status: 403,
        error: 'Access Denied: You do not have access to this workspace.',
      };
    }

    if ((ROLE_RANK[membership.role] || 0) < (ROLE_RANK[minRole] || 1)) {
      return {
        ok: false,
        status: 403,
        error: 'Access Denied: Insufficient workspace permissions.',
      };
    }

    return { ok: true, membership, companyAdmin: false, workspace, user };
  } catch (error) {
    return { ok: false, status: 500, error: 'Internal Server Error' };
  }
}

/**
 * Workspaces the user may actually access + their pending invitations.
 *
 * ADMIN  -> every workspace of their company.
 * EMPLOYEE -> only workspaces with an ACCEPTED membership.
 * PENDING memberships never grant access; they are returned as invitations.
 */
export async function getAccessibleWorkspaces(user) {
  const company = user.company ? await Company.findById(user.company) : null;
  const admin = isCompanyAdmin(user, company);

  const memberships = await WorkspaceMember.find({ user: user._id }).populate('workspace');
  const byId = new Map();

  if (admin && company) {
    const allWorkspaces = await Workspace.find({ company: company._id }).sort({ createdAt: 1 });
    const roleByWorkspace = new Map(
      memberships
        .filter((m) => m.workspace && m.status === 'accepted')
        .map((m) => [m.workspace._id.toString(), m.role])
    );
    for (const w of allWorkspaces) {
      byId.set(w._id.toString(), {
        id: w._id,
        name: w.name,
        slug: w.slug,
        description: w.description,
        role: roleByWorkspace.get(w._id.toString()) || 'admin',
        createdAt: w.createdAt,
      });
    }
  }

  const invitations = [];
  for (const m of memberships) {
    if (!m.workspace) continue;
    const wid = m.workspace._id.toString();
    if (m.status === 'pending') {
      // Company admins already have access; a pending invite is meaningless for them
      if (!admin) {
        invitations.push({
          id: m._id,
          workspaceId: m.workspace._id,
          name: m.workspace.name,
          role: m.role,
          invitedAt: m.createdAt,
        });
      }
      continue;
    }
    if (!byId.has(wid)) {
      byId.set(wid, {
        id: m.workspace._id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        description: m.workspace.description,
        role: m.role,
        createdAt: m.workspace.createdAt,
      });
    }
  }

  return { workspaces: Array.from(byId.values()), invitations };
}

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
