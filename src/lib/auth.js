import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import WorkspaceMember from '@/lib/models/WorkspaceMember';

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
 * Verifies that the user has explicit permission/membership for a given workspace.
 * If user is NOT invited/added to this specific workspace, returns null.
 */
export async function verifyWorkspaceMemberAccess(workspaceId, userId) {
  if (!workspaceId || !userId) return null;
  try {
    const membership = await WorkspaceMember.findOne({
      workspace: workspaceId,
      user: userId,
    });
    return membership;
  } catch (error) {
    return null;
  }
}

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
