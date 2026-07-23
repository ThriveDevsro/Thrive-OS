import { z } from "zod";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional().transform((value) => value || undefined);

const optionalUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .optional()
  .transform((value) => value || undefined);

export const leadImportSchema = z
  .object({
    source: z.object({
      name: z.string().trim().min(1).max(80),
      type: z.string().trim().min(1).max(80),
      externalId: optionalText(255),
      url: optionalUrl,
    }).strict(),
    lead: z.object({
      title: z.string().trim().min(1).max(240),
      description: optionalText(20_000),
      category: optionalText(120),
      budgetMin: z.number().finite().nonnegative().max(1_000_000_000).optional(),
      budgetMax: z.number().finite().nonnegative().max(1_000_000_000).optional(),
      currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
      publishedAt: z.iso.datetime({ offset: true }).optional(),
    }).strict(),
    company: z.object({
      name: optionalText(160),
      website: optionalUrl,
      domain: optionalText(253),
      ico: optionalText(40),
    }).strict().optional(),
    contact: z.object({
      firstName: optionalText(80),
      lastName: optionalText(80),
      email: z.string().trim().toLowerCase().email().max(320).optional(),
      phone: optionalText(40),
    }).strict().optional(),
    metadata: z.record(z.string().max(100), z.unknown()).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.lead.budgetMin !== undefined && value.lead.budgetMax !== undefined && value.lead.budgetMax < value.lead.budgetMin) {
      context.addIssue({ code: "custom", path: ["lead", "budgetMax"], message: "budgetMax must be greater than or equal to budgetMin" });
    }
  });

export type LeadImportInput = z.infer<typeof leadImportSchema>;
export const MAX_IMPORT_BODY_BYTES = 256 * 1024;
