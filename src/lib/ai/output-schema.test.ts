import { describe, expect, it } from "vitest";
import { leadAnalysisOutputSchema } from "./output-schema";

const output = {
  summary: "Relevant software project.",
  category: "web",
  relevanceScore: 82,
  priority: "high",
  detectedBudget: { min: 1000, max: 3000, currency: "EUR" },
  technologies: ["Next.js"],
  suggestedNextAction: "Review the brief.",
  riskFlags: [],
  missingFields: ["deadline"],
  confidence: 0.8,
};

describe("structured lead analysis output", () => {
  it("accepts the exact expected shape", () => {
    expect(leadAnalysisOutputSchema.parse(output)).toEqual(output);
  });

  it("rejects out-of-range scores and confidence", () => {
    expect(
      leadAnalysisOutputSchema.safeParse({ ...output, relevanceScore: 101 })
        .success,
    ).toBe(false);
    expect(
      leadAnalysisOutputSchema.safeParse({ ...output, confidence: 1.1 })
        .success,
    ).toBe(false);
  });

  it("rejects extra keys and inverted budgets", () => {
    expect(
      leadAnalysisOutputSchema.safeParse({ ...output, rawPayload: "secret" })
        .success,
    ).toBe(false);
    expect(
      leadAnalysisOutputSchema.safeParse({
        ...output,
        detectedBudget: { min: 5000, max: 1000, currency: "EUR" },
      }).success,
    ).toBe(false);
  });
});
