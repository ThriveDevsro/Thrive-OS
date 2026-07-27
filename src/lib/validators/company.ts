import { z } from "zod";

export const companyInput = z.object({
  name: z.string().trim().min(2, "Company name is required").max(160),
  domain: z.string().trim().toLowerCase().max(253).optional().transform((value) => value || undefined),
  email: z.string().trim().toLowerCase().email("Enter a valid email").optional().or(z.literal("")).transform((value) => value || undefined),
  phone: z.string().trim().max(40).optional().transform((value) => value || undefined),
  country: z.enum(["SK", "CZ", "GB"]),
  city: z.string().trim().max(100).optional().transform((value) => value || undefined),
  industry: z.string().trim().max(120).optional().transform((value) => value || undefined),
});

export type CompanyInput = z.infer<typeof companyInput>;
