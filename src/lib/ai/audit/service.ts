import type { Prisma } from "@/generated/prisma/client";

type AuditInput = {
  workspaceId: string;
  userId: string;
  leadId: string;
  provider: string;
  model: string;
  promptVersion: string;
  status: string;
  durationMs?: number;
  inputCharacterCount: number;
  errorCode?: string;
};

export async function writeAiAudit(
  tx: Prisma.TransactionClient,
  input: AuditInput,
) {
  await tx.auditLog.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: `ai.lead_analysis.${input.status.toLowerCase()}`,
      recordType: "Lead",
      recordId: input.leadId,
      source: "AUTOMATION",
      newValue: {
        provider: input.provider,
        model: input.model,
        promptVersion: input.promptVersion,
        status: input.status,
        durationMs: input.durationMs,
        inputCharacterCount: input.inputCharacterCount,
        errorCode: input.errorCode,
      },
    },
  });
}
