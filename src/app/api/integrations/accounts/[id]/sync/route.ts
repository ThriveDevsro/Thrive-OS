import { NextResponse } from "next/server";
import { getAiAccessContext } from "@/lib/ai/access";
import { syncGmailAccount } from "@/lib/integrations/gmail";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getAiAccessContext();
  const { id } = await params;
  const account = await prisma.emailAccount.findFirst({
    where: {
      id,
      workspaceId: access.workspaceId,
      ...(access.role === "founder" ? {} : { userId: access.userId }),
      active: true,
    },
    select: { id: true, provider: true },
  });
  if (!account || account.provider !== "google") {
    return NextResponse.redirect(
      new URL("/connections?connection=not-found", request.url),
    );
  }
  try {
    const result = await syncGmailAccount(account.id);
    return NextResponse.redirect(
      new URL(
        `/connections?connection=synced&imported=${result.imported}`,
        request.url,
      ),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/connections?connection=sync-failed", request.url),
    );
  }
}
