import { z } from "zod";
import { getAiAccessContext } from "@/lib/ai/access";
import { readAiConfig } from "@/lib/ai/config";
import { runCopilot } from "@/lib/ai/copilot/service";
import { AiError, asAiError } from "@/lib/ai/errors";
import { createAiProvider } from "@/lib/ai/provider";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";

const inputSchema = z
  .object({
    message: z.string().trim().min(1).max(3000),
    conversationId: z.string().uuid().optional(),
    contextType: z.enum(["lead", "company", "deal", "thread"]).optional(),
    contextId: z.string().uuid().optional(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const access = await getAiAccessContext();
    const contentType = request.headers.get("content-type") ?? "";
    let input: unknown;
    let attachment: File | null = null;
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      input = {
        message: form.get("message"),
        conversationId: form.get("conversationId") || undefined,
        contextType: form.get("contextType") || undefined,
        contextId: form.get("contextId") || undefined,
      };
      const candidate = form.get("attachment");
      attachment =
        candidate instanceof File && candidate.size ? candidate : null;
    } else {
      input = await request.json();
    }
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) throw new AiError("AI_CONFIG_INVALID", 400);
    const config = readAiConfig();
    const attachments = attachment
      ? [await saveAttachment(attachment, access.workspaceId)]
      : [];
    const result = await runCopilot({
      ...access,
      ...parsed.data,
      config,
      provider: createAiProvider(config),
      attachments,
    });
    return Response.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const safe = asAiError(error);
    return Response.json(
      { success: false, error: { code: safe.code } },
      {
        status: safe.httpStatus,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

const allowedTextTypes = new Set([
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
]);
const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

async function saveAttachment(file: File, workspaceId: string) {
  const isText = allowedTextTypes.has(file.type);
  const isImage = allowedImageTypes.has(file.type);
  const limit = isImage ? 5 * 1024 * 1024 : 250 * 1024;
  if ((!isText && !isImage) || file.size > limit) {
    throw new AiError("AI_INPUT_TOO_LARGE", 413);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (isImage && !hasValidImageSignature(bytes, file.type)) {
    throw new AiError("AI_CONFIG_INVALID", 400);
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const id = randomUUID();
  const directory = join(process.cwd(), ".data", "ai-uploads");
  const storageKey = join(directory, id);
  await mkdir(directory, { recursive: true });
  await writeFile(storageKey, bytes, { flag: "wx" });
  const saved = await prisma.attachment.create({
    data: {
      id,
      workspaceId,
      storageKey,
      mimeType: file.type,
      sizeBytes: file.size,
      sha256,
    },
  });
  return {
    id: saved.id,
    name: file.name.slice(0, 180),
    mimeType: file.type,
    ...(isText
      ? { text: bytes.toString("utf8") }
      : { dataBase64: bytes.toString("base64") }),
  };
}

function hasValidImageSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/png")
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  if (mimeType === "image/webp")
    return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}
