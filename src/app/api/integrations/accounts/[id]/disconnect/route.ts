import { NextResponse } from "next/server";
import { getAiAccessContext } from "@/lib/ai/access";
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
    },
  });
  if (account) {
    await prisma.$transaction([
      prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          active: false,
          config: {},
          syncCursor: null,
          syncStatus: "DISCONNECTED",
          disconnectedAt: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          workspaceId: access.workspaceId,
          userId: access.userId,
          action: "integration.disconnected",
          recordType: "EmailAccount",
          recordId: account.id,
          source: "MANUAL",
          newValue: { provider: account.provider },
        },
      }),
    ]);
  }
  return NextResponse.redirect(
    new URL("/connections?connection=disconnected", request.url),
  );
}
