"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export type ComposeState = { ok?: string; threadId?: string; error?: string };
async function context() {
  const session = await auth();
  if (!session?.user) return null;
  const workspace = await prisma.workspace.findUnique({
    where: { slug: "thrive-dev" },
  });
  const user = await prisma.user.findFirst({
    where: {
      workspaceId: workspace?.id,
      email: session.user.email ?? undefined,
    },
  });
  return workspace && user ? { workspace, user } : null;
}

export async function createConversation(
  _: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const ctx = await context();
  if (!ctx) return { error: "Sign in again to send a message." };
  const parsed = z
    .object({
      recipient: z.string().trim().email("Enter a valid recipient email."),
      subject: z.string().trim().min(2, "Enter a subject.").max(180),
      message: z.string().trim().min(2, "Write a message.").max(10000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Check the message." };
  const thread = await prisma.$transaction(async (tx) => {
    const created = await tx.emailThread.create({
      data: {
        workspaceId: ctx.workspace.id,
        subject: parsed.data.subject,
        status: "OPEN",
      },
    });
    await tx.emailMessage.create({
      data: {
        workspaceId: ctx.workspace.id,
        threadId: created.id,
        providerId: `local-${crypto.randomUUID()}`,
        sender: ctx.user.email,
        recipients: [parsed.data.recipient],
        subject: parsed.data.subject,
        sanitizedBody: parsed.data.message,
        sentAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: ctx.workspace.id,
        userId: ctx.user.id,
        action: "inbox.conversation.created",
        recordType: "EmailThread",
        recordId: created.id,
        source: "MANUAL",
        newValue: {
          recipient: parsed.data.recipient,
          subject: parsed.data.subject,
        },
      },
    });
    return created;
  });
  revalidatePath("/inbox");
  redirect(`/inbox?thread=${thread.id}`);
}

export async function replyToConversation(formData: FormData) {
  const ctx = await context();
  if (!ctx) return;
  const parsed = z
    .object({
      threadId: z.string().uuid(),
      message: z.string().trim().min(1).max(10000),
      recipient: z.string().email(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const thread = await prisma.emailThread.findFirst({
    where: { id: parsed.data.threadId, workspaceId: ctx.workspace.id },
  });
  if (!thread) return;
  await prisma.$transaction([
    prisma.emailMessage.create({
      data: {
        workspaceId: ctx.workspace.id,
        threadId: thread.id,
        providerId: `local-${crypto.randomUUID()}`,
        sender: ctx.user.email,
        recipients: [parsed.data.recipient],
        subject: thread.subject,
        sanitizedBody: parsed.data.message,
        sentAt: new Date(),
      },
    }),
    prisma.emailThread.update({
      where: { id: thread.id },
      data: { status: "OPEN" },
    }),
    prisma.auditLog.create({
      data: {
        workspaceId: ctx.workspace.id,
        userId: ctx.user.id,
        action: "inbox.reply.created",
        recordType: "EmailThread",
        recordId: thread.id,
        source: "MANUAL",
      },
    }),
  ]);
  revalidatePath("/inbox");
}

export async function setConversationStatus(formData: FormData) {
  const ctx = await context();
  if (!ctx) return;
  const parsed = z
    .object({ threadId: z.string().uuid(), status: z.enum(["OPEN", "CLOSED"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const thread = await prisma.emailThread.findFirst({
    where: { id: parsed.data.threadId, workspaceId: ctx.workspace.id },
  });
  if (!thread) return;
  await prisma.emailThread.update({
    where: { id: thread.id },
    data: { status: parsed.data.status },
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: `inbox.conversation.${parsed.data.status.toLowerCase()}`,
      recordType: "EmailThread",
      recordId: thread.id,
      source: "MANUAL",
    },
  });
  revalidatePath("/inbox");
}
