import type { AiConfig } from "../config";
import { AiError } from "../errors";
import { prisma } from "@/lib/prisma";

function startOfUtcDay(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export async function reserveAiUsage(input: {
  analysisId: string;
  workspaceId: string;
  userId: string;
  config: AiConfig;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const dayStart = startOfUtcDay(now);
  const lockKey = `${input.workspaceId}:${dayStart.toISOString()}`;

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))::text AS locked`;
    const [workspaceCount, userCount] = await Promise.all([
      tx.aiUsageEvent.count({
        where: {
          workspaceId: input.workspaceId,
          startedAt: { gte: dayStart },
        },
      }),
      tx.aiUsageEvent.count({
        where: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          startedAt: { gte: dayStart },
        },
      }),
    ]);
    if (
      workspaceCount >= input.config.dailyLimit ||
      userCount >= input.config.userDailyLimit
    ) {
      throw new AiError("AI_RATE_LIMITED", 429);
    }
    await Promise.all([
      tx.aiUsageEvent.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          operation: "lead-analysis",
          provider: input.config.provider,
          model: input.config.model,
          startedAt: now,
        },
      }),
      tx.leadAiAnalysis.update({
        where: { id: input.analysisId },
        data: { status: "PROCESSING", providerStartedAt: now },
      }),
    ]);
  });
}

export async function reserveCopilotUsage(input: {
  workspaceId: string;
  userId: string;
  operation: string;
  provider: string;
  model: string;
  config: AiConfig;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const dayStart = startOfUtcDay(now);
  const lockKey = `${input.workspaceId}:${dayStart.toISOString()}`;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))::text AS locked`;
    const [workspaceCount, userCount] = await Promise.all([
      tx.aiUsageEvent.count({
        where: {
          workspaceId: input.workspaceId,
          startedAt: { gte: dayStart },
        },
      }),
      tx.aiUsageEvent.count({
        where: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          startedAt: { gte: dayStart },
        },
      }),
    ]);
    if (
      workspaceCount >= input.config.dailyLimit ||
      userCount >= input.config.userDailyLimit
    ) {
      throw new AiError("AI_RATE_LIMITED", 429);
    }
    await tx.aiUsageEvent.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        operation: input.operation,
        provider: input.provider,
        model: input.model,
        startedAt: now,
      },
    });
  });
}
