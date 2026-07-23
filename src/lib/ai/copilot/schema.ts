import { z } from "zod";

export const copilotOutputSchema = z
  .object({
    answer: z.string().trim().min(1).max(1800),
    searchResults: z
      .array(
        z.object({
          entityType: z.enum(["lead", "company", "deal", "task", "thread"]),
          entityId: z.string().uuid(),
          title: z.string().trim().min(1).max(180),
          reason: z.string().trim().min(1).max(240),
        }),
      )
      .max(8),
    actions: z
      .array(
        z.object({
          type: z.enum([
            "DRAFT_EMAIL",
            "CREATE_TASK",
            "CREATE_DEAL",
            "SCHEDULE_FOLLOW_UP",
          ]),
          title: z.string().trim().min(1).max(180),
          description: z.string().trim().max(3000),
          entityType: z.enum(["lead", "company", "deal", "thread"]).nullable(),
          entityId: z.string().uuid().nullable(),
          dueInDays: z.number().int().min(0).max(365).nullable(),
          amount: z.number().nonnegative().max(100_000_000).nullable(),
          currency: z
            .string()
            .regex(/^[A-Z]{3}$/)
            .nullable(),
        }),
      )
      .max(4),
  })
  .strict();

export type CopilotOutput = z.infer<typeof copilotOutputSchema>;

export const copilotJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "searchResults", "actions"],
  properties: {
    answer: { type: "string", maxLength: 1800 },
    searchResults: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["entityType", "entityId", "title", "reason"],
        properties: {
          entityType: {
            type: "string",
            enum: ["lead", "company", "deal", "task", "thread"],
          },
          entityId: { type: "string" },
          title: { type: "string", maxLength: 180 },
          reason: { type: "string", maxLength: 240 },
        },
      },
    },
    actions: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "type",
          "title",
          "description",
          "entityType",
          "entityId",
          "dueInDays",
          "amount",
          "currency",
        ],
        properties: {
          type: {
            type: "string",
            enum: [
              "DRAFT_EMAIL",
              "CREATE_TASK",
              "CREATE_DEAL",
              "SCHEDULE_FOLLOW_UP",
            ],
          },
          title: { type: "string", maxLength: 180 },
          description: { type: "string", maxLength: 3000 },
          entityType: {
            type: ["string", "null"],
            enum: ["lead", "company", "deal", "thread", null],
          },
          entityId: { type: ["string", "null"] },
          dueInDays: { type: ["integer", "null"], minimum: 0, maximum: 365 },
          amount: { type: ["number", "null"], minimum: 0 },
          currency: {
            type: ["string", "null"],
            pattern: "^[A-Z]{3}$",
          },
        },
      },
    },
  },
} as const;
