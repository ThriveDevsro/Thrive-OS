import { describe, expect, it } from "vitest";
import { copilotOutputSchema } from "./schema";

const valid = {
  answer: "Review the newest relevant lead.",
  searchResults: [
    {
      entityType: "lead",
      entityId: "11111111-1111-4111-8111-111111111111",
      title: "CRM project",
      reason: "Recent request with an available budget.",
    },
  ],
  actions: [
    {
      type: "CREATE_DEAL",
      title: "CRM implementation",
      description: "Create a deal after reviewing requirements.",
      entityType: "lead",
      entityId: "11111111-1111-4111-8111-111111111111",
      dueInDays: null,
      amount: 2000,
      currency: "EUR",
    },
  ],
};

describe("Copilot structured output", () => {
  it("accepts bounded search results and proposed actions", () => {
    expect(copilotOutputSchema.parse(valid)).toEqual(valid);
  });

  it("rejects executable or unknown action types", () => {
    expect(
      copilotOutputSchema.safeParse({
        ...valid,
        actions: [{ ...valid.actions[0], type: "SEND_EMAIL" }],
      }).success,
    ).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(
      copilotOutputSchema.safeParse({ ...valid, systemCommand: "rm -rf" })
        .success,
    ).toBe(false);
  });
});
