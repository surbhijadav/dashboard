import dbConnect from '@/lib/db';
import Invitation from '@/lib/models/Invitation';
import Workspace from '@/lib/models/Workspace';
import WorkspaceMember from '@/lib/models/WorkspaceMember';
import User from '@/lib/models/User';
import Company from '@/lib/models/Company';
import ActivityLog from '@/lib/models/ActivityLog';
import { authorizeWorkspaceAccess, isCompanyAdmin } from '@/lib/auth';
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiryDate,
  invitationExpiryDays,
  buildInvitationUrl,
} from '@/lib/invitationToken';
import { sendInvitationEmail } from '@/lib/emailService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['admin', 'editor', 'viewer'];

async function logEvent(action, workspaceId, userId, details) {
  await ActivityLog.create({ workspace: workspaceId, user: userId, action, details });
}

/**
 * Validate an invitation document and lazily expire pending invitations past
 * their expiry date. Returns a { status, error } block when invalid.
 */
export async function classifyInvitation(invitation) {
  if (!invitation) {
    return { status: 404, error: 'Invitation not found.' };
  }
  if (invitation.status === 'cancelled') {
    return { status: 410, error: 'This invitation has been cancelled.' };
  }
  if (invitation.status === 'accepted') {
    return { status: 410, error: 'This invitation has already been accepted.' };
  }
  if (invitation.status === 'declined') {
    return { status: 410, error: 'This invitation is no longer valid.' };
  }
  if (invitation.status === 'expired' || invitation.expiresAt <= new Date()) {
    if (invitation.status === 'pending') {
      await Invitation.updateOne({ _id: invitation._id, status: 'pending' }, { status: 'expired' });
      await logEvent(
        'Invitation Expired',
        invitation.workspace,
        invitation.invitedBy,
        `Invitation for ${invitation.email} expired`
      );
    }
    return { status: 410, error: 'This invitation has expired. Please contact your company administrator.' };
  }
  return null;
}

export function findInvitationByToken(token) {
  if (!token || typeof token !== 'string' || token.length > 512) return null;
  const tokenHash = hashInvitationToken(token);
  return Invitation.findOne({ tokenHash });
}

/**
 * Create (and email) a workspace invitation.
 * Enforces, server-side: admin auth, company/tenant match, workspace ownership,
 * role validity, email validity, and no duplicate membership/pending invitation.
 */
export async function createInvitation({ authUser, workspaceId, email, name, role }) {
  const access = await authorizeWorkspaceAccess(workspaceId, authUser.userId, 'admin');
  if (!access.ok) {
    return {
      error: { status: access.status, message: 'Access Denied: Only workspace admins can invite members.' },
    };
  }

  const workspace = access.workspace;
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const assignedRole = VALID_ROLES.includes(role) ? role : 'editor';

  if (!EMAIL_RE.test(normalizedEmail)) {
    return { error: { status: 400, message: 'Please provide a valid email address.' } };
  }

  // Tenant isolation: an existing user from another company can never be invited
  const targetUser = await User.findOne({ email: normalizedEmail });
  if (targetUser) {
    if (targetUser.company && targetUser.company.toString() !== workspace.company.toString()) {
      return {
        error: {
          status: 403,
          message: 'This user belongs to a different company and cannot be invited.',
        },
      };
    }
    const company = await Company.findById(workspace.company);
    if (isCompanyAdmin(targetUser, company)) {
      return {
        error: { status: 400, message: 'This user already has access to this workspace.' },
      };
    }
    const membership = await WorkspaceMember.findOne({
      workspace: workspaceId,
      user: targetUser._id,
      status: 'accepted',
    });
    if (membership) {
      return {
        error: { status: 400, message: 'This user already has access to this workspace.' },
      };
    }
    const legacyPending = await WorkspaceMember.findOne({
      workspace: workspaceId,
      user: targetUser._id,
      status: 'pending',
    });
    if (legacyPending) {
      return {
        error: { status: 400, message: 'An invitation is already pending for this user.' },
      };
    }
  }

  const existingPending = await Invitation.findOne({
    workspace: workspaceId,
    email: normalizedEmail,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });
  if (existingPending) {
    return {
      error: { status: 400, message: 'An invitation is already pending for this email.' },
    };
  }

  const token = generateInvitationToken();
  const expiresAt = invitationExpiryDate();

  const invitation = await Invitation.create({
    company: workspace.company,
    workspace: workspaceId,
    email: normalizedEmail,
    invitedName: name ? String(name).trim() : '',
    role: assignedRole,
    invitedBy: authUser.userId,
    tokenHash: hashInvitationToken(token),
    status: 'pending',
    expiresAt,
  });

  const company = await Company.findById(workspace.company);
  const inviter = await User.findById(authUser.userId);

  await sendInvitationEmail({
    to: normalizedEmail,
    inviterName: inviter?.name || 'Your administrator',
    companyName: company?.name || 'the company',
    workspaceName: workspace.name,
    role: assignedRole,
    acceptUrl: buildInvitationUrl(token),
    expiresAt,
  });

  await logEvent(
    'Invitation Sent',
    workspaceId,
    authUser.userId,
    `${normalizedEmail} invited to "${workspace.name}" as ${assignedRole} (expires in ${invitationExpiryDays()} days)`
  );

  return { invitation };
}

/**
 * Atomically accept an invitation for an authenticated user whose email matches.
 *
 * Standalone MongoDB has no multi-document transactions, so correctness relies on:
 *  - an atomic status flip gating the whole operation (double-accept impossible)
 *  - the unique (workspace, user) index on WorkspaceMember (idempotent upsert)
 */
export async function acceptInvitationForUser(invitation, user) {
  const invalid = await classifyInvitation(invitation);
  if (invalid) {
    return { error: invalid };
  }

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return {
      error: { status: 403, message: 'This invitation was sent to a different email address.' },
    };
  }

  if (user.company && user.company.toString() !== invitation.company.toString()) {
    return {
      error: {
        status: 403,
        message: 'This account belongs to a different company and cannot accept this invitation.',
      },
    };
  }

  const workspace = await Workspace.findById(invitation.workspace);
  if (!workspace || workspace.company.toString() !== invitation.company.toString()) {
    return { error: { status: 410, message: 'This invitation is no longer valid.' } };
  }

  const existingMembership = await WorkspaceMember.findOne({
    workspace: workspace._id,
    user: user._id,
    status: 'accepted',
  });

  // Atomic gate: only one accept can ever succeed per invitation
  const flipped = await Invitation.findOneAndUpdate(
    { _id: invitation._id, status: 'pending', expiresAt: { $gt: new Date() } },
    { status: 'accepted', acceptedAt: new Date() }
  );
  if (!flipped) {
    const fresh = await Invitation.findById(invitation._id);
    const reason = await classifyInvitation(fresh);
    return { error: reason || { status: 409, message: 'This invitation has already been accepted.' } };
  }

  if (!existingMembership) {
    await WorkspaceMember.findOneAndUpdate(
      { workspace: workspace._id, user: user._id },
      {
        workspace: workspace._id,
        company: invitation.company,
        user: user._id,
        role: invitation.role,
        status: 'accepted',
      },
      { upsert: true }
    );
  }

  if (!user.company) {
    user.company = invitation.company;
  }
  if (!user.currentWorkspace) {
    user.currentWorkspace = workspace._id;
  }
  await user.save();

  await logEvent(
    'Invitation Accepted',
    workspace._id,
    user._id,
    `${user.email} accepted invitation to join "${workspace.name}" as ${invitation.role}`
  );

  const company = await Company.findById(invitation.company);
  return {
    alreadyMember: Boolean(existingMembership),
    message: existingMembership
      ? 'You already have access to this workspace.'
      : `Welcome to ${company?.name || 'the company'} — you've joined ${workspace.name}.`,
    workspace: { id: workspace._id, name: workspace.name },
    companyName: company?.name || 'Company',
  };
}

/**
 * Regenerate the token of a pending (or just-expired) invitation.
 * Invalidates any previous token so only one active token exists at a time.
 */
export async function rotateInvitationToken(invitation) {
  const token = generateInvitationToken();
  invitation.tokenHash = hashInvitationToken(token);
  invitation.status = 'pending';
  invitation.expiresAt = invitationExpiryDate();
  await invitation.save();
  return token;
}

export { sendInvitationEmail, logEvent };
