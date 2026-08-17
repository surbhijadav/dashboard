// Email service abstraction.
// Provider: Resend (via plain fetch — zero dependencies) when RESEND_API_KEY is set.
// Otherwise a console transport is used in development so the invitation link
// is still deliverable without configuring a provider.

const EMAIL_FROM = process.env.EMAIL_FROM || 'Workspace Dashboard <onboarding@resend.dev>';

function roleLabel(role) {
  return { admin: 'Admin', editor: 'Editor', viewer: 'Viewer' }[role] || 'Member';
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function renderInvitationEmail({ inviterName, companyName, workspaceName, role, acceptUrl, expiresAt }) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f5f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f8;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;border:1px solid #e4e5ea;">
            <tr>
              <td style="padding:36px 40px 8px;">
                <p style="margin:0 0 16px;font-size:14px;color:#6b6c74;">Hello,</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#202128;">
                  <strong style="color:#101116;">${inviterName}</strong> has invited you to join:
                </p>
                <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#101116;">${companyName}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 24px;width:100%;">
                  <tr>
                    <td style="padding:10px 14px;background-color:#f7f7f9;border-radius:8px;font-size:14px;color:#4a4b55;">
                      <strong style="color:#101116;">Workspace:</strong> ${workspaceName}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;background-color:#f7f7f9;border-radius:8px;font-size:14px;color:#4a4b55;">
                      <strong style="color:#101116;">Role:</strong> ${roleLabel(role)}
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#4a4b55;">
                  Click the button below to accept your invitation.
                </p>
                <a href="${acceptUrl}"
                   style="display:inline-block;padding:12px 26px;background-color:#5e6ad2;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">
                  Accept Invitation
                </a>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#8a8b95;">
                  This invitation expires on ${formatDate(expiresAt)}.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px 32px;border-top:1px solid #ececf0;margin-top:28px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9a9ba4;">
                  If you were not expecting this invitation, you can safely ignore this email.
                  <br>You can also paste this link into your browser:<br>
                  <span style="color:#5e6ad2;word-break:break-all;">${acceptUrl}</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendInvitationEmail({ to, inviterName, companyName, workspaceName, role, acceptUrl, expiresAt }) {
  const subject = `You're invited to join ${companyName} on Workspace Dashboard`;
  const html = renderInvitationEmail({ inviterName, companyName, workspaceName, role, acceptUrl, expiresAt });
  const text = `Hello,\n\n${inviterName} has invited you to join ${companyName}.\n\nWorkspace: ${workspaceName}\nRole: ${roleLabel(role)}\n\nAccept your invitation:\n${acceptUrl}\n\nThis invitation expires on ${formatDate(expiresAt)}.\n\nIf you were not expecting this invitation, you can safely ignore this email.`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`\n[emails:dev] To: ${to}\n[emails:dev] Subject: ${subject}\n[emails:dev] Invitation link: ${acceptUrl}\n`);
    return { delivered: false, dev: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('Invitation email delivery failed:', res.status, body);
    return { delivered: false, dev: false };
  }

  return { delivered: true, dev: false };
}
