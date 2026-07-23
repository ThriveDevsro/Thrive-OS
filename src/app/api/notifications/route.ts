import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";

async function notificationContext() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const workspace = await prisma.workspace.findUnique({
    where: { slug: "thrive-dev" },
    select: { id: true },
  });
  if (!workspace) return null;
  const user = await prisma.user.findFirst({
    where: { workspaceId: workspace.id, email: session.user.email },
    select: { id: true },
  });
  return user ? { workspaceId: workspace.id, userId: user.id } : null;
}

export async function GET() {
  const context = await notificationContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const notifications = await prisma.notification.findMany({
    where: { workspaceId: context.workspaceId, userId: context.userId },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return NextResponse.json({
    unread: notifications.filter((item) => !item.readAt).length,
    notifications: notifications.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      read: Boolean(item.readAt),
      createdAt: item.createdAt.toISOString(),
    })),
  });
}

export async function POST() {
  const context = await notificationContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.notification.updateMany({
    where: { workspaceId: context.workspaceId, userId: context.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
