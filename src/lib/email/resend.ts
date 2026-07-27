import { Resend } from "resend";
import { readFile } from "node:fs/promises";
import path from "node:path";

type InvitationContent = {
  name: string;
  invitedBy: string;
  inviteUrl: string;
  logoUrl: string;
  preview?: boolean;
};

export function resendConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM_EMAIL &&
      process.env.APP_URL,
  );
}

export function buildTeamInvitationHtml(input: InvitationContent) {
  const safeName = escapeHtml(firstName(input.name));
  const safeInviter = escapeHtml(input.invitedBy);
  const safeInviteUrl = escapeHtml(input.inviteUrl);
  const safeLogoUrl = escapeHtml(input.logoUrl);
  const buttonLabel = input.preview ? "Open Thrive OS" : "Accept invitation";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
  </head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:Inter,'Segoe UI',Arial,sans-serif;color:#172033">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${safeInviter} invited you to join Thrive OS.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#ffffff">
      <tr>
        <td align="center" style="padding:0 16px 40px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff">
            <tr>
              <td style="padding:22px 32px;background:#000000;text-align:left">
                <img src="${safeLogoUrl}" width="174" alt="Thrive Dev" style="display:block;width:174px;max-width:56%;height:auto;border:0">
              </td>
            </tr>
            <tr>
              <td style="padding:38px 32px 12px;text-align:left">
                <h1 style="margin:0 0 16px;color:#111827;font-size:28px;line-height:35px;font-weight:750;letter-spacing:-.02em">Hi ${safeName}, you’re invited to Thrive OS</h1>
                <p style="margin:0;color:#566175;font-size:16px;line-height:26px">${safeInviter} invited you to join the Thrive OS workspace.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0;text-align:left">
                <a href="${safeInviteUrl}" style="display:inline-block;padding:14px 22px;background:#2563eb;border-radius:9px;color:#ffffff;font-size:15px;line-height:20px;font-weight:750;text-decoration:none">${buttonLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 0;text-align:left">
                <p style="margin:0;color:#929bad;font-size:12px;line-height:18px">This invitation link expires in 24 hours.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 0;text-align:left">
                <a href="https://app.thrivedev.co" style="color:#929bad;font-size:12px;line-height:18px;text-decoration:underline">app.thrivedev.co</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendTeamInvitation(input: {
  to: string;
  name: string;
  invitedBy: string;
  token: string;
}) {
  const config = getEmailConfig();
  const inviteUrl = `${config.appUrl}/accept-invite/${encodeURIComponent(input.token)}`;

  await sendEmail({
    from: config.from,
    apiKey: config.apiKey,
    to: input.to,
    subject: "You’re invited to Thrive OS",
    html: buildTeamInvitationHtml({
      name: input.name,
      invitedBy: input.invitedBy,
      inviteUrl,
      logoUrl: "cid:thrive-dev-logo",
    }),
    text: `${input.invitedBy} invited you to Thrive OS. Accept your invitation within 24 hours: ${inviteUrl}`,
  });
}

export async function sendTeamInvitationPreview(input: {
  to: string;
  name: string;
  invitedBy: string;
}) {
  const config = getEmailConfig();

  await sendEmail({
    from: config.from,
    apiKey: config.apiKey,
    to: input.to,
    subject: "[Preview] You’re invited to Thrive OS",
    html: buildTeamInvitationHtml({
      name: input.name,
      invitedBy: input.invitedBy,
      inviteUrl: `${config.appUrl}/login`,
      logoUrl: "cid:thrive-dev-logo",
      preview: true,
    }),
    text: `This is a visual preview of the Thrive OS invitation. Open Thrive OS: ${config.appUrl}/login`,
  });
}

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (!apiKey || !from || !appUrl) {
    throw new Error(
      "Resend is not configured. Add RESEND_API_KEY, RESEND_FROM_EMAIL and APP_URL to .env.",
    );
  }
  return { apiKey, from, appUrl };
}

async function sendEmail(input: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const resend = new Resend(input.apiKey);
  const logo = await readFile(
    path.join(process.cwd(), "public", "thrive-dev-logo.png"),
  );
  const { error } = await resend.emails.send({
    from: input.from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: [
      {
        content: logo,
        filename: "thrive-dev-logo.png",
        contentType: "image/png",
        contentId: "thrive-dev-logo",
      },
    ],
  });
  if (error) throw new Error(error.message);
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[char] ?? char,
  );
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}
