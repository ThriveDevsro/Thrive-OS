import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  decryptProviderTokens,
  encryptProviderTokens,
  oauthConfig,
} from "./oauth";
import { emitAutomationEvent } from "@/lib/automations/engine";

type GmailHeader = { name?: string; value?: string };
type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};
type GmailMessage = {
  id: string;
  threadId: string;
  historyId?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: GmailPart & { headers?: GmailHeader[] };
};

export async function syncGmailAccount(accountId: string) {
  const account = await prisma.emailAccount.findFirst({
    where: { id: accountId, provider: "google", active: true },
  });
  if (!account) throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
  await prisma.emailAccount.update({
    where: { id: account.id },
    data: { syncStatus: "SYNCING", syncErrorCode: null },
  });
  try {
    const accessToken = await accessTokenFor(account);
    const query = [
      `newer_than:${Math.min(Math.max(account.syncWindowDays, 1), 365)}d`,
      "-in:spam",
      "-in:trash",
      "-category:promotions",
    ].join(" ");
    const list = await gmailJson<{
      messages?: Array<{ id: string }>;
    }>(
      `/users/me/messages?maxResults=100&q=${encodeURIComponent(query)}`,
      accessToken,
    );
    const contacts = await prisma.contact.findMany({
      where: {
        workspaceId: account.workspaceId,
        deletedAt: null,
        email: { not: null },
      },
      select: {
        id: true,
        email: true,
        ownerId: true,
        companyId: true,
        company: {
          select: {
            opportunities: {
              where: { stage: { terminal: false } },
              select: { id: true },
              orderBy: { updatedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    const byEmail = new Map(
      contacts
        .filter((contact) => contact.email)
        .map((contact) => [contact.email!.toLowerCase(), contact]),
    );
    let imported = 0;
    let skipped = 0;
    let latestHistoryId = account.syncCursor;
    for (const item of list.messages ?? []) {
      const message = await gmailJson<GmailMessage>(
        `/users/me/messages/${item.id}?format=full`,
        accessToken,
      );
      latestHistoryId = message.historyId ?? latestHistoryId;
      const headers = message.payload?.headers ?? [];
      const sender = header(headers, "From");
      const recipients = [
        ...addresses(header(headers, "To")),
        ...addresses(header(headers, "Cc")),
      ];
      const senderAddress = addresses(sender)[0] ?? "";
      const external = [senderAddress, ...recipients].filter(
        (address) => address && address !== account.address.toLowerCase(),
      );
      const contact = external
        .map((address) => byEmail.get(address))
        .find(Boolean);
      if (account.syncMode === "CRM_MATCHED" && !contact) {
        skipped += 1;
        continue;
      }
      const sentAt = new Date(Number(message.internalDate ?? Date.now()));
      const subject = header(headers, "Subject") || "(No subject)";
      const direction =
        senderAddress === account.address.toLowerCase()
          ? "OUTBOUND"
          : "INBOUND";
      const savedThread = await prisma.$transaction(async (tx) => {
        const thread = await tx.emailThread.upsert({
          where: {
            workspaceId_providerId: {
              workspaceId: account.workspaceId,
              providerId: message.threadId,
            },
          },
          create: {
            workspaceId: account.workspaceId,
            accountId: account.id,
            providerId: message.threadId,
            subject,
            status: "OPEN",
            contactId: contact?.id,
            companyId: contact?.companyId,
            opportunityId: contact?.company?.opportunities[0]?.id,
            lastMessageAt: sentAt,
          },
          update: {
            accountId: account.id,
            subject,
            contactId: contact?.id,
            companyId: contact?.companyId,
            opportunityId: contact?.company?.opportunities[0]?.id,
            lastMessageAt: sentAt,
          },
        });
        await tx.emailMessage.upsert({
          where: {
            workspaceId_providerId: {
              workspaceId: account.workspaceId,
              providerId: message.id,
            },
          },
          create: {
            workspaceId: account.workspaceId,
            accountId: account.id,
            threadId: thread.id,
            providerId: message.id,
            sender: senderAddress || sender,
            recipients,
            subject,
            sanitizedBody: extractBody(message.payload).slice(0, 50_000),
            direction,
            hasAttachments: hasAttachments(message.payload),
            sentAt,
          },
          update: {
            threadId: thread.id,
            subject,
            direction,
            sentAt,
          },
        });
        if (contact) {
          await tx.contact.update({
            where: { id: contact.id },
            data:
              direction === "INBOUND"
                ? { lastReplyAt: sentAt }
                : { lastContactedAt: sentAt },
          });
          if (contact.companyId) {
            await tx.company.update({
              where: { id: contact.companyId },
              data: { lastContactedAt: sentAt },
            });
          }
        }
        return thread;
      });
      if (direction === "INBOUND") {
        await emitAutomationEvent({
          workspaceId: account.workspaceId,
          eventId: `gmail:${message.id}`,
          event: "email.received",
          payload: {
            ownerId: contact?.ownerId ?? account.userId,
            title: subject,
            companyId: contact?.companyId,
            contactId: contact?.id,
            opportunityId: contact?.company?.opportunities[0]?.id,
            threadId: savedThread.id,
            direction,
          },
        }).catch(() => undefined);
      }
      imported += 1;
    }
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: {
        syncStatus: "IDLE",
        syncCursor: latestHistoryId,
        lastSyncedAt: new Date(),
        syncErrorCode: null,
      },
    });
    return { imported, skipped };
  } catch {
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: { syncStatus: "ERROR", syncErrorCode: "GMAIL_SYNC_FAILED" },
    });
    throw new Error("GMAIL_SYNC_FAILED");
  }
}

async function accessTokenFor(account: Prisma.EmailAccountGetPayload<object>) {
  const config = oauthConfig("google");
  const stored = account.config as Record<string, unknown>;
  const encrypted = stored.encrypted as Parameters<
    typeof decryptProviderTokens
  >[0];
  const tokens = decryptProviderTokens(encrypted, config.key);
  const expiresAt = Number(tokens.expires_at ?? 0);
  if (
    typeof tokens.access_token === "string" &&
    expiresAt > Date.now() + 60_000
  ) {
    return tokens.access_token;
  }
  if (typeof tokens.refresh_token !== "string")
    throw new Error("GMAIL_RECONNECT_REQUIRED");
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("GMAIL_RECONNECT_REQUIRED");
  const refreshed = (await response.json()) as Record<string, unknown>;
  const merged: Record<string, unknown> = {
    ...tokens,
    ...refreshed,
    expires_at: Date.now() + Number(refreshed.expires_in ?? 3600) * 1000,
  };
  await prisma.emailAccount.update({
    where: { id: account.id },
    data: {
      config: {
        ...stored,
        encrypted: encryptProviderTokens(merged, config.key),
      } as Prisma.InputJsonValue,
    },
  });
  return String(merged.access_token);
}

async function gmailJson<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("GMAIL_API_FAILED");
  return (await response.json()) as T;
}

function header(headers: GmailHeader[], name: string) {
  return (
    headers.find((item) => item.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? ""
  );
}

function addresses(value: string) {
  return [...value.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map(
    (match) => match[0].toLowerCase(),
  );
}

function extractBody(part?: GmailPart): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decode(part.body.data);
  }
  const plain = part.parts?.find((item) => item.mimeType === "text/plain");
  if (plain) return extractBody(plain);
  const html = part.parts?.find((item) => item.mimeType === "text/html");
  if (html) return stripHtml(extractBody(html));
  if (part.mimeType === "text/html" && part.body?.data) {
    return stripHtml(decode(part.body.data));
  }
  return (part.parts ?? []).map(extractBody).filter(Boolean).join("\n");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAttachments(part?: GmailPart): boolean {
  if (!part) return false;
  return Boolean(
    part.parts?.some(
      (item) =>
        (item.body && "attachmentId" in item.body) || hasAttachments(item),
    ),
  );
}
