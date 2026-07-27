"use server";
import { revalidatePath } from "next/cache";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";

async function founderContext() {
  const session = await auth();
  if (
    !session?.user ||
    session.user.role !== "founder" ||
    !session.user.workspaceId
  )
    return null;
  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
  });
  const user = await prisma.user.findFirst({
    where: {
      workspaceId: workspace?.id,
      id: session.user.id,
      status: "ACTIVE",
    },
  });
  return workspace && user ? { workspace, user } : null;
}

export async function updateLeadSource(formData: FormData): Promise<void> {
  const context = await founderContext();
  if (!context) return;
  const sourceId = String(formData.get("sourceId") ?? "");
  const enable = formData.get("enable") === "true";
  const approval = formData.get("approval") === "on";
  const source = await prisma.leadSource.findFirst({
    where: { id: sourceId, workspaceId: context.workspace.id },
  });
  if (!source) return;
  if (enable && source.key === "webtrh" && !approval) return;
  await prisma.$transaction([
    prisma.leadSource.update({
      where: { id: source.id },
      data: {
        active: enable,
        approvalConfirmedAt:
          enable && approval ? new Date() : source.approvalConfirmedAt,
        approvalConfirmedBy:
          enable && approval ? context.user.id : source.approvalConfirmedBy,
      },
    }),
    prisma.auditLog.create({
      data: {
        workspaceId: context.workspace.id,
        userId: context.user.id,
        action: enable ? "lead_source.enabled" : "lead_source.disabled",
        recordType: "LeadSource",
        recordId: source.id,
        source: "MANUAL",
        newValue: { active: enable, approvalConfirmed: approval },
      },
    }),
  ]);
  revalidatePath("/settings/sources");
}
