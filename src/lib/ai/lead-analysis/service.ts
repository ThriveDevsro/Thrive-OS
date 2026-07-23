import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { can, type SystemRole } from "@/lib/permissions";
import type { AiConfig } from "../config";
import { AiError, asAiError } from "../errors";
import type { AiProvider } from "../types";
import { writeAiAudit } from "../audit/service";
import { reserveAiUsage } from "../usage/service";
import { buildLeadAnalysisDto } from "./dto";
import {
  buildLeadAnalysisPrompt,
  LEAD_ANALYSIS_PROMPT_VERSION,
  LEAD_ANALYSIS_SYSTEM_INSTRUCTION,
} from "./prompt";

type AnalyzeInput = {
  workspaceId: string;
  userId: string;
  role: SystemRole;
  leadId: string;
  force: boolean;
  config: AiConfig;
  provider: AiProvider;
};

export type PublicAnalysis = {
  id: string;
  status: string;
  summary: string | null;
  category: string | null;
  relevanceScore: number | null;
  priority: string | null;
  detectedBudget: {
    min: number | null;
    max: number | null;
    currency: string | null;
  };
  technologies: string[];
  suggestedNextAction: string | null;
  riskFlags: string[];
  missingFields: string[];
  confidence: number | null;
  provider: string;
  model: string;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
  errorCode: string | null;
  reused?: boolean;
};

export const analysisSelect = {
  id: true,
  status: true,
  summary: true,
  category: true,
  relevanceScore: true,
  priority: true,
  detectedBudgetMin: true,
  detectedBudgetMax: true,
  detectedBudgetCurrency: true,
  technologies: true,
  suggestedNextAction: true,
  riskFlags: true,
  missingFields: true,
  confidence: true,
  provider: true,
  model: true,
  durationMs: true,
  createdAt: true,
  completedAt: true,
  errorCode: true,
} satisfies Prisma.LeadAiAnalysisSelect;

type SelectedAnalysis = Prisma.LeadAiAnalysisGetPayload<{
  select: typeof analysisSelect;
}>;

function stringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function serializeAnalysis(
  analysis: SelectedAnalysis,
  reused = false,
): PublicAnalysis {
  return {
    id: analysis.id,
    status: analysis.status,
    summary: analysis.summary,
    category: analysis.category,
    relevanceScore: analysis.relevanceScore,
    priority: analysis.priority,
    detectedBudget: {
      min:
        analysis.detectedBudgetMin === null
          ? null
          : Number(analysis.detectedBudgetMin),
      max:
        analysis.detectedBudgetMax === null
          ? null
          : Number(analysis.detectedBudgetMax),
      currency: analysis.detectedBudgetCurrency,
    },
    technologies: stringArray(analysis.technologies),
    suggestedNextAction: analysis.suggestedNextAction,
    riskFlags: stringArray(analysis.riskFlags),
    missingFields: stringArray(analysis.missingFields),
    confidence: analysis.confidence,
    provider: analysis.provider,
    model: analysis.model,
    durationMs: analysis.durationMs,
    createdAt: analysis.createdAt.toISOString(),
    completedAt: analysis.completedAt?.toISOString() ?? null,
    errorCode: analysis.errorCode,
    ...(reused ? { reused: true } : {}),
  };
}

export async function analyzeLead(
  input: AnalyzeInput,
): Promise<PublicAnalysis> {
  const mayReadAll = can(input.role, "ai.lead.analyze.all");
  const mayReadOwned = can(input.role, "ai.lead.analyze.owned");
  if (!mayReadAll && !mayReadOwned)
    throw new AiError("AI_PERMISSION_DENIED", 403);
  if (input.force && !can(input.role, "ai.lead.force_rerun")) {
    throw new AiError("AI_PERMISSION_DENIED", 403);
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: input.leadId,
      workspaceId: input.workspaceId,
      ...(!mayReadAll ? { assigneeId: input.userId } : {}),
    },
    include: {
      company: { select: { name: true, domain: true } },
      source: { select: { name: true } },
      importEvents: {
        select: { metadata: true },
        orderBy: { receivedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!lead) throw new AiError("AI_LEAD_NOT_FOUND", 404);

  const dto = buildLeadAnalysisDto(lead);
  const prompt = buildLeadAnalysisPrompt(dto);
  const inputCharacterCount = prompt.length;
  if (inputCharacterCount > input.config.maxInputCharacters) {
    throw new AiError("AI_INPUT_TOO_LARGE", 413);
  }
  const inputHash = createHash("sha256")
    .update(JSON.stringify(dto))
    .digest("hex");

  if (!input.force) {
    const existing = await prisma.leadAiAnalysis.findFirst({
      where: {
        leadId: lead.id,
        inputHash,
        promptVersion: LEAD_ANALYSIS_PROMPT_VERSION,
        model: input.config.model,
        status: { in: ["COMPLETED", "APPROVED", "IGNORED"] },
      },
      orderBy: { createdAt: "desc" },
      select: analysisSelect,
    });
    if (existing) return serializeAnalysis(existing, true);
  }

  const activeJobKey = createHash("sha256")
    .update(
      [
        input.workspaceId,
        lead.id,
        LEAD_ANALYSIS_PROMPT_VERSION,
        input.config.model,
      ].join(":"),
    )
    .digest("hex");

  let analysis: { id: string };
  try {
    analysis = await prisma.leadAiAnalysis.create({
      data: {
        workspaceId: input.workspaceId,
        leadId: lead.id,
        provider: input.provider.name,
        model: input.provider.model,
        promptVersion: LEAD_ANALYSIS_PROMPT_VERSION,
        status: "QUEUED",
        inputHash,
        inputCharacterCount,
        createdByUserId: input.userId,
        activeJobKey,
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AiError("AI_DUPLICATE_JOB", 409);
    }
    throw error;
  }

  const startedAt = Date.now();
  try {
    await reserveAiUsage({
      analysisId: analysis.id,
      workspaceId: input.workspaceId,
      userId: input.userId,
      config: input.config,
    });
    const result = await input.provider.analyzeLead({
      systemInstruction: LEAD_ANALYSIS_SYSTEM_INSTRUCTION,
      prompt,
    });
    const durationMs = Date.now() - startedAt;
    const completed = await prisma.$transaction(async (tx) => {
      const saved = await tx.leadAiAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: "COMPLETED",
          summary: result.summary,
          category: result.category,
          relevanceScore: result.relevanceScore,
          priority: result.priority,
          detectedBudgetMin: result.detectedBudget.min,
          detectedBudgetMax: result.detectedBudget.max,
          detectedBudgetCurrency: result.detectedBudget.currency,
          technologies: result.technologies,
          suggestedNextAction: result.suggestedNextAction,
          riskFlags: result.riskFlags,
          missingFields: result.missingFields,
          confidence: result.confidence,
          durationMs,
          completedAt: new Date(),
          activeJobKey: null,
        },
        select: analysisSelect,
      });
      await writeAiAudit(tx, {
        workspaceId: input.workspaceId,
        userId: input.userId,
        leadId: lead.id,
        provider: input.provider.name,
        model: input.provider.model,
        promptVersion: LEAD_ANALYSIS_PROMPT_VERSION,
        status: "COMPLETED",
        durationMs,
        inputCharacterCount,
      });
      return saved;
    });
    return serializeAnalysis(completed);
  } catch (error) {
    const aiError = asAiError(error);
    const durationMs = Date.now() - startedAt;
    await prisma
      .$transaction(async (tx) => {
        await tx.leadAiAnalysis.update({
          where: { id: analysis.id },
          data: {
            status: "FAILED",
            errorCode: aiError.code,
            durationMs,
            completedAt: new Date(),
            activeJobKey: null,
          },
        });
        await writeAiAudit(tx, {
          workspaceId: input.workspaceId,
          userId: input.userId,
          leadId: lead.id,
          provider: input.provider.name,
          model: input.provider.model,
          promptVersion: LEAD_ANALYSIS_PROMPT_VERSION,
          status: "FAILED",
          durationMs,
          inputCharacterCount,
          errorCode: aiError.code,
        });
      })
      .catch(() => undefined);
    throw aiError;
  }
}
