"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/role-access";

const activityInput = z.object({
  companyId: z.string().uuid(),
  kind: z.enum(["NOTE", "CALL"]),
  body: z.string().trim().min(2).max(4000),
  notifyUserId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || undefined),
});

export async function addCompanyActivity(formData: FormData) {
  const { workspace, user } = await getAccessContext();
  const parsed = activityInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const company = await prisma.company.findFirst({
    where: {
      id: parsed.data.companyId,
      workspaceId: workspace.id,
      deletedAt: null,
    },
    select: { id: true, name: true },
  });
  if (!company) return;

  const teammate = parsed.data.notifyUserId
    ? await prisma.user.findFirst({
        where: {
          id: parsed.data.notifyUserId,
          workspaceId: workspace.id,
          status: "ACTIVE",
        },
        select: { id: true },
      })
    : null;

  await prisma.$transaction(async (tx) => {
    if (parsed.data.kind === "NOTE") {
      await tx.note.create({
        data: {
          companyId: company.id,
          authorId: user.id,
          body: parsed.data.body,
        },
      });
    }

    const activity = await tx.activity.create({
      data: {
        workspaceId: workspace.id,
        companyId: company.id,
        actorId: user.id,
        type: parsed.data.kind,
        title: parsed.data.kind === "CALL" ? "Call logged" : "Note added",
        body: parsed.data.body,
        metadata: teammate ? { mentionedUserId: teammate.id } : {},
      },
    });

    if (teammate && teammate.id !== user.id) {
      await tx.notification.create({
        data: {
          workspaceId: workspace.id,
          userId: teammate.id,
          type: "MENTION",
          title: `${user.name} mentioned you at ${company.name}`,
          body: parsed.data.body.slice(0, 300),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        action:
          parsed.data.kind === "CALL"
            ? "company.call_logged"
            : "company.note_added",
        recordType: "Company",
        recordId: company.id,
        source: "MANUAL",
        newValue: {
          activityId: activity.id,
          mentionedUserId: teammate?.id ?? null,
        },
      },
    });
  });

  revalidatePath(`/companies/${company.id}`);
}
