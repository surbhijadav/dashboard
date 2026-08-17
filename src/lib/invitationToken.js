import crypto from 'crypto';

// Cryptographically secure token — never derived from user/company data
export function generateInvitationToken() {
  return crypto.randomBytes(32).toString('base64url');
}

// Only the SHA-256 hash is persisted; the raw token lives solely in the email link
export function hashInvitationToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function invitationExpiryDays() {
  const days = parseInt(process.env.INVITATION_EXPIRY_DAYS || '7', 10);
  return Number.isFinite(days) && days > 0 ? days : 7;
}

export function invitationExpiryDate() {
  return new Date(Date.now() + invitationExpiryDays() * 24 * 60 * 60 * 1000);
}

export function buildInvitationUrl(token) {
  const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${appUrl}/invitations/accept?token=${encodeURIComponent(token)}`;
}
