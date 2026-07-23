import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { automationEvents, matchesAutomationCondition } from "./engine";

describe("automation safety rules", () => {
  it("exposes only approved event types", () => {
    expect(automationEvents).toEqual([
      "email.received",
      "email.sent",
      "lead.created",
      "opportunity.stage_changed",
      "no_activity",
    ]);
  });

  it("evaluates allowlisted equality and numeric conditions", () => {
    expect(
      matchesAutomationCondition(
        { field: "direction", operator: "eq", value: "INBOUND" },
        { direction: "INBOUND" },
      ),
    ).toBe(true);
    expect(
      matchesAutomationCondition(
        { field: "score", operator: "gte", value: 80 },
        { score: 90 },
      ),
    ).toBe(true);
  });

  it("rejects unknown fields and operators", () => {
    expect(
      matchesAutomationCondition(
        { field: "password", operator: "eq", value: "secret" },
        {},
      ),
    ).toBe(false);
    expect(
      matchesAutomationCondition(
        { field: "score", operator: "execute", value: 0 },
        { score: 90 },
      ),
    ).toBe(false);
  });
});
