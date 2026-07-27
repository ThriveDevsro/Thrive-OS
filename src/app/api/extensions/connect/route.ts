import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import {
  createExtensionToken,
  extensionTokenExpiry,
  hashExtensionToken,
  validChromeRedirect,
} from "@/lib/extensions/auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const callback = validChromeRedirect(requestUrl.searchParams.get("redirect_uri"));
  if (!callback) {
    return NextResponse.json({ error: "Invalid extension callback" }, { status: 400 });
  }
  const session = await auth();
  if (!session?.user?.id || !session.user.workspaceId) {
    const returnTo = `${requestUrl.pathname}${requestUrl.search}`;
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(returnTo)}`, request.url),
    );
  }
  const token = createExtensionToken();
  await prisma.$transaction([
    prisma.extensionToken.updateMany({
      where: {
        userId: session.user.id,
        label: "Gmail Chrome extension",
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    }),
    prisma.extensionToken.create({
      data: {
        workspaceId: session.user.workspaceId,
        userId: session.user.id,
        tokenHash: hashExtensionToken(token),
        label: "Gmail Chrome extension",
        expiresAt: extensionTokenExpiry(),
      },
    }),
  ]);
  callback.searchParams.set("token", token);
  return NextResponse.redirect(callback);
}
