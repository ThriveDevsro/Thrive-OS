import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const {
  leadFindFirst,
  analysisFindFirst,
  analysisCreate,
  transaction,
  reserveAiUsage,
} = vi.hoisted(() => ({
  leadFindFirst: vi.fn(),
  analysisFindFirst: vi.fn(),
  analysisCreate: vi.fn(),
  transaction: vi.fn(),
  reserveAiUsage: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: { findFirst: leadFindFirst },
    leadAiAnalysis: {
      findFirst: analysisFindFirst,
      create: analysisCreate,
    },
    $transaction: transaction,
  },
}));
vi.mock("../usage/service", () => ({ reserveAiUsage }));
vi.mock("../audit/service", () => ({ writeAiAudit: vi.fn() }));

import type { AiConfig } from "../config";
import type { AiProvider } from "../types";
import { analyzeLead } from "./service";

const config: AiConfig = {
  enabled: true,
  provider: "gemini",
  apiKey: "server-secret-key-that-is-long",
  model: "gemini-test",
  dailyLimit: 20,
  userDailyLimit: 5,
  maxInputCharacters: 5000,
  requestTimeoutMs: 1000,
  voiceEnabled: false,
  audioMaxSizeMb: 10,
  audioMaxDurationSeconds: 300,
  endpoint: new URL("https://generativelanguage.googleapis.com/v1beta/"),
};

const provider: AiProvider = {
  name: "gemini",
  model: "gemini-test",
  analyzeLead: vi.fn(),
};

const lead = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Build a website",
  description: "A public project brief",
  serviceCategory: "web",
  budgetMinor: 100_000n,
  budgetCurrency: "EUR",
  company: null,
  source: { name: "Webtrh" },
  importEvents: [{ metadata: { region: "SK" } }],
};

const completed = {
  id: "analysis-id",
  status: "COMPLETED",
  summary: "Relevant.",
  category: "web",
  relevanceScore: 80,
  priority: "high",
  detectedBudgetMin: null,
  detectedBudgetMax: null,
  detectedBudgetCurrency: null,
  technologies: [],
  suggestedNextAction: "Review.",
  riskFlags: [],
  missingFields: [],
  confidence: 0.8,
  provider: "gemini",
  model: "gemini-test",
  durationMs: 100,
  createdAt: new Date("2026-07-23T10:00:00Z"),
  completedAt: new Date("2026-07-23T10:00:01Z"),
  errorCode: null,
};

function input(role: "founder" | "salesperson" = "founder") {
  return {
    workspaceId: "workspace",
    userId: "user",
    role,
    leadId: lead.id,
    force: false,
    config,
    provider,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  leadFindFirst.mockResolvedValue(lead);
  analysisFindFirst.mockResolvedValue(null);
});

describe("lead analysis orchestration", () => {
  it("denies roles without an AI analysis capability before reading data", async () => {
    await expect(
      analyzeLead(input("unknown" as "founder")),
    ).rejects.toMatchObject({
      code: "AI_PERMISSION_DENIED",
    });
    expect(leadFindFirst).not.toHaveBeenCalled();
  });

  it("scopes salesperson reads to their assigned leads", async () => {
    leadFindFirst.mockResolvedValue(null);
    await expect(analyzeLead(input("salesperson"))).rejects.toMatchObject({
      code: "AI_LEAD_NOT_FOUND",
    });
    expect(leadFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: "workspace",
          assigneeId: "user",
        }),
      }),
    );
  });

  it("cannot load a lead from a different workspace", async () => {
    leadFindFirst.mockResolvedValue(null);
    await expect(analyzeLead(input("founder"))).rejects.toMatchObject({
      code: "AI_LEAD_NOT_FOUND",
    });
    expect(leadFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "workspace" }),
      }),
    );
  });

  it("returns an idempotent completed analysis without calling Gemini", async () => {
    analysisFindFirst.mockResolvedValue(completed);
    const result = await analyzeLead(input());
    expect(result).toMatchObject({ id: "analysis-id", reused: true });
    expect(analysisCreate).not.toHaveBeenCalled();
    expect(provider.analyzeLead).not.toHaveBeenCalled();
  });

  it("blocks oversized input before creating a job", async () => {
    await expect(
      analyzeLead({
        ...input(),
        config: { ...config, maxInputCharacters: 10 },
      }),
    ).rejects.toMatchObject({ code: "AI_INPUT_TOO_LARGE" });
    expect(analysisCreate).not.toHaveBeenCalled();
  });

  it("maps the unique active-job lock to a duplicate-job response", async () => {
    analysisCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "7.9.0",
        meta: { target: ["activeJobKey"] },
      }),
    );
    await expect(analyzeLead(input())).rejects.toMatchObject({
      code: "AI_DUPLICATE_JOB",
      httpStatus: 409,
    });
    expect(reserveAiUsage).not.toHaveBeenCalled();
  });
});
