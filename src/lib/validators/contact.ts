import { z } from "zod";
export const contactInput = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid business email").optional().or(z.literal("")).transform(v => v || undefined),
  phone: z.string().trim().max(40).optional().transform(v => v || undefined),
  jobTitle: z.string().trim().max(120).optional().transform(v => v || undefined),
  companyId: z.string().uuid().optional().or(z.literal("")).transform(v => v || undefined),
  language: z.enum(["sk", "cs", "en"]),
  status: z.enum(["NEW", "READY_FOR_OUTREACH", "CONTACTED", "REPLIED", "QUALIFIED", "MEETING_BOOKED", "NOT_INTERESTED", "FOLLOW_UP_LATER", "UNREACHABLE", "OPTED_OUT", "ARCHIVED"]),
});
