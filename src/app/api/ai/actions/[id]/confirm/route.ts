import { z } from "zod";
import { getAiAccessContext } from "@/lib/ai/access";
import { AiError, asAiError } from "@/lib/ai/errors";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

const previewSchema = z.object({
  type: z.enum([
    "DRAFT_EMAIL",
    "CREATE_DEAL",
  ]),
  title: z.string().min(1).max(180),
  description: z.string().max(3000),
  entityType: z.enum(["lead", "company", "deal", "thread"]).nullable(),
  entityId: z.string().uuid().nullable(),
  dueInDays: z.number().int().min(0).max(365).nullable(),
  amount: z.number().nonnegative().max(100_000_000).nullable(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
});

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success)
      throw new AiError("AI_PERMISSION_DENIED", 404);
    const access = await getAiAccessContext();
    if (!can(access.role, "ai.copilot.use"))
      throw new AiError("AI_PERMISSION_DENIED", 403);
    const action = await prisma.aIAction.findFirst({
      where: {
        id,
        workspaceId: access.workspaceId,
        userId: access.userId,
        status: "PROPOSED",
      },
    });
    if (!action) throw new AiError("AI_PERMISSION_DENIED", 404);
    const parsed = previewSchema.safeParse(action.preview);
    if (!parsed.success) throw new AiError("AI_INVALID_OUTPUT", 422);
    const preview = parsed.data;
    const target = await resolveTarget(
      access.workspaceId,
      preview.entityType,
      preview.entityId,
    );

    const result = await prisma.$transaction(async (tx) => {
      let resultType = "DRAFT";
      let resultId: string | null = null;
      if (preview.type === "CREATE_DEAL") {
        if (!target.companyId) throw new AiError("AI_LEAD_NOT_FOUND", 422);
        const stage = await tx.opportunityStage.findFirst({
          where: {
            workspaceId: access.workspaceId,
            terminal: false,
          },
          orderBy: { position: "asc" },
        });
        if (!stage) throw new AiError("AI_PROVIDER_UNAVAILABLE", 503);
        const deal = await tx.opportunity.create({
          data: {
            workspaceId: access.workspaceId,
            companyId: target.companyId,
            ownerId: access.userId,
            stageId: stage.id,
            name: preview.title,
            valueMinor: BigInt(Math.round((preview.amount ?? 0) * 100)),
            currency: preview.currency ?? "EUR",
            probability: stage.probability,
            nextStep: preview.description,
          },
        });
        resultType = "Opportunity";
        resultId = deal.id;
      }
      await tx.aIAction.update({
        where: { id: action.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          resultType,
          resultId,
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: access.workspaceId,
          userId: access.userId,
          action: "ai.action.confirmed",
          recordType: "AIAction",
          recordId: action.id,
          source: "MANUAL",
          newValue: {
            tool: action.tool,
            resultType,
            resultId,
          },
        },
      });
      return { resultType, resultId };
    });
    return Response.json({ success: true, ...result });
  } catch (error) {
    const safe = asAiError(error);
    return Response.json(
      { success: false, error: { code: safe.code } },
      { status: safe.httpStatus },
    );
  }
}

async function resolveTarget(
  workspaceId: string,
  type: string | null,
  id: string | null,
) {
  if (!type || !id) return { companyId: null, opportunityId: null };
  if (type === "company") {
    const company = await prisma.company.findFirst({
      where: { id, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!company) throw new AiError("AI_LEAD_NOT_FOUND", 404);
    return { companyId: company.id, opportunityId: null };
  }
  if (type === "lead") {
    const lead = await prisma.lead.findFirst({
      where: { id, workspaceId },
      select: { companyId: true },
    });
    if (!lead) throw new AiError("AI_LEAD_NOT_FOUND", 404);
    return { companyId: lead.companyId, opportunityId: null };
  }
  if (type === "deal") {
    const deal = await prisma.opportunity.findFirst({
      where: { id, workspaceId },
      select: { id: true, companyId: true },
    });
    if (!deal) throw new AiError("AI_LEAD_NOT_FOUND", 404);
    return { companyId: deal.companyId, opportunityId: deal.id };
  }
  const thread = await prisma.emailThread.findFirst({
    where: { id, workspaceId },
    select: { id: true },
  });
  if (!thread) throw new AiError("AI_LEAD_NOT_FOUND", 404);
  return { companyId: null, opportunityId: null };
}
