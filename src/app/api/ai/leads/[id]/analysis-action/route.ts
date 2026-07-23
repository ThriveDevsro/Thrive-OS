import { z } from "zod";
import { getAiAccessContext } from "@/lib/ai/access";
import { AiError, asAiError } from "@/lib/ai/errors";
import {
  analysisSelect,
  serializeAnalysis,
} from "@/lib/ai/lead-analysis/service";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const requestSchema = z
  .object({
    analysisId: z.string().uuid(),
    action: z.enum(["approve", "ignore"]),
  })
  .strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: leadId } = await params;
    if (!z.string().uuid().safeParse(leadId).success)
      throw new AiError("AI_LEAD_NOT_FOUND", 404);
    const access = await getAiAccessContext();
    if (!can(access.role, "ai.analysis.approve"))
      throw new AiError("AI_PERMISSION_DENIED", 403);
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) throw new AiError("AI_CONFIG_INVALID", 400);
    const analysis = await prisma.leadAiAnalysis.findFirst({
      where: {
        id: parsed.data.analysisId,
        leadId,
        workspaceId: access.workspaceId,
        ...(!can(access.role, "ai.lead.analyze.all")
          ? { lead: { assigneeId: access.userId } }
          : {}),
      },
      select: { id: true, status: true },
    });
    if (!analysis) throw new AiError("AI_LEAD_NOT_FOUND", 404);
    if (!["COMPLETED", "APPROVED", "IGNORED"].includes(analysis.status))
      throw new AiError("AI_DUPLICATE_JOB", 409);

    const status = parsed.data.action === "approve" ? "APPROVED" : "IGNORED";
    const saved = await prisma.$transaction(async (tx) => {
      const updated = await tx.leadAiAnalysis.update({
        where: { id: analysis.id },
        data:
          status === "APPROVED"
            ? {
                status,
                approvedAt: new Date(),
                approvedByUserId: access.userId,
                ignoredAt: null,
              }
            : {
                status,
                ignoredAt: new Date(),
                approvedAt: null,
                approvedByUserId: null,
              },
        select: analysisSelect,
      });
      await tx.auditLog.create({
        data: {
          workspaceId: access.workspaceId,
          userId: access.userId,
          action: `ai.lead_analysis.${parsed.data.action}`,
          recordType: "Lead",
          recordId: leadId,
          source: "MANUAL",
          newValue: { analysisId: analysis.id, status },
        },
      });
      return updated;
    });
    return Response.json(
      { success: true, analysis: serializeAnalysis(saved) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const safe = asAiError(error);
    return Response.json(
      {
        success: false,
        error: {
          code: safe.code,
          message:
            safe.code === "AI_PERMISSION_DENIED"
              ? "You do not have permission for this action."
              : "The AI analysis action could not be completed.",
        },
      },
      { status: safe.httpStatus, headers: { "Cache-Control": "no-store" } },
    );
  }
}
