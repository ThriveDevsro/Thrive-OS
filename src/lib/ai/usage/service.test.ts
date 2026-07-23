import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction, queryRaw, count, update, create } = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transaction },
}));

import type { AiConfig } from "../config";
import { reserveAiUsage } from "./service";

const config: AiConfig = {
  enabled: true,
  provider: "gemini",
  apiKey: "server-secret-key-that-is-long",
  model: "gemini-test",
  dailyLimit: 2,
  userDailyLimit: 1,
  maxInputCharacters: 5000,
  requestTimeoutMs: 1000,
  voiceEnabled: false,
  audioMaxSizeMb: 10,
  audioMaxDurationSeconds: 300,
  endpoint: new URL("https://generativelanguage.googleapis.com/v1beta/"),
};

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation((callback) =>
    callback({
      $queryRaw: queryRaw,
      aiUsageEvent: { count, create },
      leadAiAnalysis: { update },
    }),
  );
  queryRaw.mockResolvedValue([]);
  update.mockResolvedValue({});
  create.mockResolvedValue({});
});

describe("daily AI usage reservation", () => {
  it("atomically reserves usage after workspace and user checks", async () => {
    count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const now = new Date("2026-07-23T12:00:00.000Z");
    await reserveAiUsage({
      analysisId: "analysis",
      workspaceId: "workspace",
      userId: "user",
      config,
      now,
    });
    expect(queryRaw).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith({
      where: { id: "analysis" },
      data: { status: "PROCESSING", providerStartedAt: now },
    });
  });

  it("blocks a user at their daily limit without starting the provider", async () => {
    count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    await expect(
      reserveAiUsage({
        analysisId: "analysis",
        workspaceId: "workspace",
        userId: "user",
        config,
      }),
    ).rejects.toMatchObject({ code: "AI_RATE_LIMITED" });
    expect(update).not.toHaveBeenCalled();
  });

  it("blocks a workspace at its daily limit", async () => {
    count.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
    await expect(
      reserveAiUsage({
        analysisId: "analysis",
        workspaceId: "workspace",
        userId: "user",
        config,
      }),
    ).rejects.toMatchObject({ code: "AI_RATE_LIMITED" });
    expect(update).not.toHaveBeenCalled();
  });
});
