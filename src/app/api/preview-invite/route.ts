import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import {
  buildTeamInvitationHtml,
  sendTeamInvitationPreview,
} from "@/lib/email/resend";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? "Patrik";
  const invitedBy = searchParams.get("invitedBy") ?? "Thrive Dev";
  const appUrl =
    process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  return new NextResponse(
    buildTeamInvitationHtml({
      name,
      invitedBy,
      inviteUrl: `${appUrl}/accept-invite/preview-demo-token`,
      logoUrl: `${appUrl}/thrive-dev-logo.png`,
    }),
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== "founder") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json().catch(() => ({}));
  const recipient = data.to ?? session.user.email;
  if (recipient !== session.user.email) {
    return NextResponse.json(
      { ok: false, error: "Previews can only be sent to your own account." },
      { status: 403 },
    );
  }

  try {
    await sendTeamInvitationPreview({
      to: recipient,
      name: data.name ?? session.user.name ?? "Patrik",
      invitedBy: data.invitedBy ?? session.user.name ?? "Thrive Dev",
    });
    return NextResponse.json({ ok: true, sentTo: recipient });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown email error",
      },
      { status: 400 },
    );
  }
}
