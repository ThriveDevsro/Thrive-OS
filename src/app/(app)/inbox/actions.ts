"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";
import { sendGmailMessage } from "@/lib/integrations/gmail";
import { z } from "zod";

export type ComposeState = { ok?: string; threadId?: string; error?: string };
export type ReplyState = { ok?: string; error?: string };
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
  const account = await prisma.emailAccount.findFirst({
    where: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      provider: "google",
      active: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!account) {
    return { error: "Connect your Gmail account before sending an email." };
  }
  let sent: Awaited<ReturnType<typeof sendGmailMessage>>;
  try {
    sent = await sendGmailMessage({
      accountId: account.id,
      recipient: parsed.data.recipient,
      subject: parsed.data.subject,
      body: parsed.data.message,
    });
  } catch (error) {
    return { error: gmailErrorMessage(error) };
  }
  const thread = await prisma.$transaction(async (tx) => {
    const created = await tx.emailThread.create({
      data: {
        workspaceId: ctx.workspace.id,
        accountId: account.id,
        providerId: sent.providerThreadId,
        subject: parsed.data.subject,
        status: "OPEN",
        lastMessageAt: sent.sentAt,
      },
    });
    await tx.emailMessage.create({
      data: {
        workspaceId: ctx.workspace.id,
        accountId: account.id,
        threadId: created.id,
        providerId: sent.providerId,
        internetMessageId: sent.internetMessageId,
        sender: account.address,
        recipients: [parsed.data.recipient],
        subject: parsed.data.subject,
        sanitizedBody: parsed.data.message,
        direction: "OUTBOUND",
        sentAt: sent.sentAt,
      },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: ctx.workspace.id,
        userId: ctx.user.id,
        action: "email.sent",
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

export async function replyToConversation(
  _: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const ctx = await context();
  if (!ctx) return { error: "Sign in again to send a reply." };
  const parsed = z
    .object({
      threadId: z.string().uuid(),
      message: z.string().trim().min(1).max(10000),
      recipient: z.string().email(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the reply details." };
  const thread = await prisma.emailThread.findFirst({
    where: {
      id: parsed.data.threadId,
      workspaceId: ctx.workspace.id,
      account: {
        userId: ctx.user.id,
        provider: "google",
        active: true,
      },
    },
    include: {
      account: true,
      messages: {
        where: { internetMessageId: { not: null } },
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
  });
  if (!thread?.account) {
    return { error: "Reconnect the Gmail account used by this conversation." };
  }
  let sent: Awaited<ReturnType<typeof sendGmailMessage>>;
  try {
    sent = await sendGmailMessage({
      accountId: thread.account.id,
      recipient: parsed.data.recipient,
      subject: thread.subject,
      body: parsed.data.message,
      providerThreadId: thread.providerId,
      inReplyTo: thread.messages[0]?.internetMessageId,
    });
  } catch (error) {
    return { error: gmailErrorMessage(error) };
  }
  await prisma.$transaction([
    prisma.emailMessage.create({
      data: {
        workspaceId: ctx.workspace.id,
        accountId: thread.account.id,
        threadId: thread.id,
        providerId: sent.providerId,
        internetMessageId: sent.internetMessageId,
        sender: thread.account.address,
        recipients: [parsed.data.recipient],
        subject: thread.subject,
        sanitizedBody: parsed.data.message,
        direction: "OUTBOUND",
        sentAt: sent.sentAt,
      },
    }),
    prisma.emailThread.update({
      where: { id: thread.id },
      data: {
        status: "OPEN",
        providerId: sent.providerThreadId,
        lastMessageAt: sent.sentAt,
      },
    }),
    prisma.auditLog.create({
      data: {
        workspaceId: ctx.workspace.id,
        userId: ctx.user.id,
        action: "email.reply.sent",
        recordType: "EmailThread",
        recordId: thread.id,
        source: "MANUAL",
      },
    }),
  ]);
  revalidatePath("/inbox");
  return { ok: "Reply sent through Gmail." };
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

function gmailErrorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "GMAIL_RECONNECT_REQUIRED") {
    return "Reconnect Gmail to grant the new send permission.";
  }
  return "Gmail could not send this message. Try again.";
}
