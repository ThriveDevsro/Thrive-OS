"use server";
import { revalidatePath } from "next/cache";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { emitAutomationEvent } from "@/lib/automations/engine";
export async function createOpportunity(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const workspace = await prisma.workspace.findUnique({
    where: { slug: "thrive-dev" },
  });
  const user = await prisma.user.findFirst({
    where: {
      workspaceId: workspace?.id,
      email: session.user.email ?? undefined,
    },
  });
  if (!workspace || !user) return;
  const parsed = z
    .object({
      name: z.string().min(3),
      companyId: z.string().uuid(),
      stageId: z.string().uuid(),
      value: z.coerce.number().positive(),
      currency: z.enum(["EUR", "GBP", "CZK"]),
      nextStep: z
        .string()
        .trim()
        .optional()
        .transform((value) => value || "Initial review"),
      nextStepAt: z
        .string()
        .optional()
        .transform((value) =>
          value ? new Date(value) : new Date(Date.now() + 86_400_000),
        ),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const stage = await prisma.opportunityStage.findFirst({
    where: { id: parsed.data.stageId, workspaceId: workspace.id },
  });
  if (!stage) return;
  await prisma.$transaction(async (tx) => {
    const opportunity = await tx.opportunity.create({
      data: {
        workspaceId: workspace.id,
        companyId: parsed.data.companyId,
        ownerId: user.id,
        stageId: stage.id,
        name: parsed.data.name,
        valueMinor: BigInt(Math.round(parsed.data.value * 100)),
        currency: parsed.data.currency,
        probability: stage.probability,
        nextStep: parsed.data.nextStep,
        nextStepAt: parsed.data.nextStepAt,
      },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        action: "opportunity.created",
        recordType: "Opportunity",
        recordId: opportunity.id,
        source: "MANUAL",
        newValue: { name: opportunity.name, stage: stage.name },
      },
    });
  });
  revalidatePath("/deals");
}
export async function moveOpportunity(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const workspace = await prisma.workspace.findUnique({
    where: { slug: "thrive-dev" },
  });
  const user = await prisma.user.findFirst({
    where: {
      workspaceId: workspace?.id,
      email: session.user.email ?? undefined,
    },
  });
  if (!workspace || !user) return;
  const id = String(formData.get("id"));
  const stageId = String(formData.get("stageId"));
  const stage = await prisma.opportunityStage.findFirst({
    where: { id: stageId, workspaceId: workspace.id },
  });
  if (!stage) return;
  const deal = await prisma.opportunity.findFirst({
    where: { id, workspaceId: workspace.id },
    select: {
      id: true,
      name: true,
      ownerId: true,
      companyId: true,
      stageId: true,
    },
  });
  if (!deal) return;
  await prisma.opportunity.update({
    where: { id },
    data: { stageId, probability: stage.probability },
  });
  await emitAutomationEvent({
    workspaceId: workspace.id,
    eventId: `deal-stage:${deal.id}:${stage.id}`,
    event: "opportunity.stage_changed",
    payload: {
      ownerId: deal.ownerId ?? user.id,
      title: deal.name,
      companyId: deal.companyId,
      opportunityId: deal.id,
      stage: stage.key,
    },
  }).catch(() => undefined);
  revalidatePath("/deals");
}
