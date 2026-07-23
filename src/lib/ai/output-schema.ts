import { z } from "zod";

const nullableMoney = z.number().finite().nonnegative().nullable();

export const leadAnalysisOutputSchema = z
  .object({
    summary: z.string().trim().min(1).max(800),
    category: z.string().trim().max(100).nullable(),
    relevanceScore: z.number().int().min(0).max(100),
    priority: z.enum(["low", "medium", "high"]),
    detectedBudget: z.object({
      min: nullableMoney,
      max: nullableMoney,
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .nullable(),
    }),
    technologies: z.array(z.string().trim().min(1).max(100)).max(20),
    suggestedNextAction: z.string().trim().min(1).max(500),
    riskFlags: z.array(z.string().trim().min(1).max(200)).max(20),
    missingFields: z.array(z.string().trim().min(1).max(100)).max(20),
    confidence: z.number().min(0).max(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.detectedBudget.min !== null &&
      value.detectedBudget.max !== null &&
      value.detectedBudget.max < value.detectedBudget.min
    ) {
      context.addIssue({
        code: "custom",
        path: ["detectedBudget", "max"],
        message: "Maximum budget must not be lower than minimum budget",
      });
    }
  });

export type LeadAnalysisOutput = z.infer<typeof leadAnalysisOutputSchema>;

export const leadAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "category",
    "relevanceScore",
    "priority",
    "detectedBudget",
    "technologies",
    "suggestedNextAction",
    "riskFlags",
    "missingFields",
    "confidence",
  ],
  properties: {
    summary: { type: "string", maxLength: 800 },
    category: { type: ["string", "null"], maxLength: 100 },
    relevanceScore: { type: "integer", minimum: 0, maximum: 100 },
    priority: { type: "string", enum: ["low", "medium", "high"] },
    detectedBudget: {
      type: "object",
      additionalProperties: false,
      required: ["min", "max", "currency"],
      properties: {
        min: { type: ["number", "null"], minimum: 0 },
        max: { type: ["number", "null"], minimum: 0 },
        currency: {
          type: ["string", "null"],
          pattern: "^[A-Z]{3}$",
        },
      },
    },
    technologies: {
      type: "array",
      maxItems: 20,
      items: { type: "string", maxLength: 100 },
    },
    suggestedNextAction: { type: "string", maxLength: 500 },
    riskFlags: {
      type: "array",
      maxItems: 20,
      items: { type: "string", maxLength: 200 },
    },
    missingFields: {
      type: "array",
      maxItems: 20,
      items: { type: "string", maxLength: 100 },
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
} as const;
