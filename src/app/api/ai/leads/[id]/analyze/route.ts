import { z } from "zod";
import { getAiAccessContext } from "@/lib/ai/access";
import { readAiConfig } from "@/lib/ai/config";
import { AiError, asAiError } from "@/lib/ai/errors";
import { analyzeLead } from "@/lib/ai/lead-analysis/service";
import { createAiProvider } from "@/lib/ai/provider";

const requestSchema = z.object({ force: z.boolean().optional() }).strict();

function errorResponse(error: unknown) {
  const safe = asAiError(error);
  return Response.json(
    { success: false, error: { code: safe.code, message: message(safe) } },
    {
      status: safe.httpStatus,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success)
      throw new AiError("AI_LEAD_NOT_FOUND", 404);
    const access = await getAiAccessContext();
    const config = readAiConfig();
    const raw = await request.text();
    let body: unknown = {};
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        throw new AiError("AI_CONFIG_INVALID", 400);
      }
    }
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) throw new AiError("AI_CONFIG_INVALID", 400);
    const analysis = await analyzeLead({
      ...access,
      leadId: id,
      force: parsed.data.force ?? false,
      config,
      provider: createAiProvider(config),
    });
    return Response.json(
      { success: true, analysis },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function message(error: AiError) {
  switch (error.code) {
    case "AI_DISABLED":
      return "AI analysis is disabled.";
    case "AI_CONFIG_INVALID":
      return "AI is not configured correctly.";
    case "AI_RATE_LIMITED":
      return "The daily AI analysis limit has been reached.";
    case "AI_PROVIDER_TIMEOUT":
      return "The AI provider did not respond in time.";
    case "AI_PROVIDER_UNAVAILABLE":
      return "The AI provider is temporarily unavailable.";
    case "AI_PROVIDER_REJECTED":
      return "The AI provider rejected the request.";
    case "AI_INVALID_OUTPUT":
      return "The AI response could not be validated.";
    case "AI_INPUT_TOO_LARGE":
      return "The lead is too large for AI analysis.";
    case "AI_DUPLICATE_JOB":
      return "This lead is already being analyzed.";
    case "AI_LEAD_NOT_FOUND":
      return "Lead not found.";
    default:
      return "You do not have permission to analyze this lead.";
  }
}
