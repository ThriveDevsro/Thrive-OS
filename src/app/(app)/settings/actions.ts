"use server";
import { revalidatePath } from "next/cache";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export type SettingsState = { ok?: string; error?: string };
async function founderContext() {
  const session = await auth();
  if (!session?.user || session.user.role !== "founder") return null;
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

export async function updateWorkspace(
  _: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const context = await founderContext();
  if (!context) return { error: "Founder permission is required." };
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(100),
      timezone: z.enum(["Europe/Bratislava", "Europe/Prague", "Europe/London"]),
      currency: z.enum(["EUR", "CZK", "GBP"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the workspace values." };
  await prisma.$transaction([
    prisma.workspace.update({
      where: { id: context.workspace.id },
      data: parsed.data,
    }),
    prisma.auditLog.create({
      data: {
        workspaceId: context.workspace.id,
        userId: context.user.id,
        action: "workspace.settings.updated",
        recordType: "Workspace",
        recordId: context.workspace.id,
        source: "MANUAL",
        newValue: parsed.data,
      },
    }),
  ]);
  revalidatePath("/settings");
  return { ok: "Workspace settings saved." };
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
  revalidatePath("/settings");
}
