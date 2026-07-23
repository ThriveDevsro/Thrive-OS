import { describe, expect, it } from "vitest";
import { copilotOutputSchema } from "./schema";

const valid = {
  answer: "Prioritize the highest-scoring lead.",
  searchResults: [
    {
      entityType: "lead",
      entityId: "11111111-1111-4111-8111-111111111111",
      title: "CRM project",
      reason: "High score and available budget.",
    },
  ],
  actions: [
    {
      type: "CREATE_TASK",
      title: "Review CRM brief",
      description: "Check requirements before outreach.",
      entityType: "lead",
      entityId: "11111111-1111-4111-8111-111111111111",
      dueInDays: 1,
      amount: null,
      currency: null,
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
