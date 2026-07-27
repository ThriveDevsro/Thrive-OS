import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { prisma } from "@/lib/prisma";
import {
  createExtensionToken,
  extensionTokenExpiry,
  hashExtensionToken,
} from "@/lib/extensions/auth";

const LABEL = "Google Workspace Add-on";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.workspaceId) {
    return NextResponse.redirect(
      new URL(
        `/login?callbackUrl=${encodeURIComponent("/api/extensions/workspace/connect")}`,
        request.url,
      ),
    );
  }
  const token = createExtensionToken();
  await prisma.$transaction([
    prisma.extensionToken.updateMany({
      where: { userId: session.user.id, label: LABEL, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.extensionToken.create({
      data: {
        workspaceId: session.user.workspaceId,
        userId: session.user.id,
        tokenHash: hashExtensionToken(token),
        label: LABEL,
        expiresAt: extensionTokenExpiry(),
      },
    }),
  ]);
  return new NextResponse(connectionPage(token), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    },
  });
}

function connectionPage(token: string) {
  const safeToken = token.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Connect Thrive OS</title>
<style>body{margin:0;background:#f6f7f9;color:#171717;font:14px Arial,sans-serif}.card{max-width:560px;margin:12vh auto;padding:28px;border:1px solid #ddd;border-radius:14px;background:#fff;box-shadow:0 16px 45px #0001}h1{margin:0 0 8px;font-size:24px}p{color:#666;line-height:1.6}code{display:block;overflow-wrap:anywhere;margin:20px 0;padding:15px;border-radius:9px;background:#f1f3f5;color:#111;font-size:12px}button{height:40px;padding:0 16px;border:0;border-radius:8px;background:#050505;color:#fff;font-weight:700;cursor:pointer}.note{font-size:11px}</style></head>
<body><main class="card"><h1>Connect Google Workspace Add-on</h1>
<p>Copy this one-time connection token and paste it into the Thrive OS card in Gmail.</p>
<code id="token">${safeToken}</code><button onclick="navigator.clipboard.writeText(document.getElementById('token').textContent);this.textContent='Copied'">Copy token</button>
<p class="note">The token expires in 30 days. Creating another token immediately revokes this one.</p></main></body></html>`;
}
