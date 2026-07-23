import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { scoreLead } from "@/lib/leads/scoring";
import {
  buildDedupeKey,
  moneyToMinor,
  normalizeDomain,
  normalizePhone,
  normalizeRegistrationNumber,
  normalizeUrl,
} from "./normalize";
import type { LeadImportInput } from "./schema";
import { emitAutomationEvent } from "@/lib/automations/engine";

export type ImportResult = {
  duplicate: boolean;
  leadId: string;
  importId: string;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function existingImport(workspaceId: string, dedupeKey: string) {
  return prisma.importEvent.findUnique({
    where: {
      workspaceId_canonicalKey: { workspaceId, canonicalKey: dedupeKey },
    },
    select: { id: true, leadId: true },
  });
}

export async function importLead(
  input: LeadImportInput,
): Promise<ImportResult> {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: "thrive-dev" },
    select: { id: true, currency: true },
  });
  if (!workspace) throw new Error("Import workspace is not configured");

  const dedupeKey = buildDedupeKey(input);
  const duplicate = await existingImport(workspace.id, dedupeKey);
  if (duplicate?.leadId) {
    const attempt = await prisma.importEvent.create({
      data: {
        workspaceId: workspace.id,
        sourceName: input.source.name.toLowerCase(),
        sourceType: input.source.type.toLowerCase(),
        externalId: input.source.externalId,
        sourceUrl: normalizeUrl(input.source.url),
        dedupeKey,
        status: "DUPLICATE",
        leadId: duplicate.leadId,
        metadata: json(input.metadata ?? {}),
        rawPayload: json(input),
        processedAt: new Date(),
      },
    });
    return { duplicate: true, leadId: duplicate.leadId, importId: attempt.id };
  }

  let importEvent: { id: string };
  try {
    importEvent = await prisma.importEvent.create({
      data: {
        workspaceId: workspace.id,
        sourceName: input.source.name.toLowerCase(),
        sourceType: input.source.type.toLowerCase(),
        externalId: input.source.externalId,
        sourceUrl: normalizeUrl(input.source.url),
        dedupeKey,
        canonicalKey: dedupeKey,
        status: "NEW",
        metadata: json(input.metadata ?? {}),
        rawPayload: json(input),
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await existingImport(workspace.id, dedupeKey);
      if (raced?.leadId)
        return { duplicate: true, leadId: raced.leadId, importId: raced.id };
    }
    throw error;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const domain = normalizeDomain(
        input.company?.domain ?? input.company?.website,
      );
      const registrationNumber = normalizeRegistrationNumber(
        input.company?.ico,
      );
      const phone = normalizePhone(input.contact?.phone);
      const email = input.contact?.email?.toLowerCase();
      let needsReview = false;

      const companyClauses: Prisma.CompanyWhereInput[] = [];
      if (domain)
        companyClauses.push({
          domain: { equals: domain, mode: "insensitive" },
        });
      if (registrationNumber)
        companyClauses.push({
          registrationNumber: {
            equals: registrationNumber,
            mode: "insensitive",
          },
        });
      const companyMatches = companyClauses.length
        ? await tx.company.findMany({
            where: {
              workspaceId: workspace.id,
              deletedAt: null,
              OR: companyClauses,
            },
            take: 3,
          })
        : [];

      let company = companyMatches.length === 1 ? companyMatches[0] : null;
      if (companyMatches.length > 1) needsReview = true;
      if (
        !company &&
        companyMatches.length === 0 &&
        input.company?.name &&
        (domain || registrationNumber)
      ) {
        company = await tx.company.create({
          data: {
            workspaceId: workspace.id,
            name: input.company.name,
            domain,
            website: input.company.website,
            registrationNumber,
          },
        });
      }

      const contactClauses: Prisma.ContactWhereInput[] = [];
      if (email)
        contactClauses.push({ email: { equals: email, mode: "insensitive" } });
      if (phone) contactClauses.push({ phone });
      const contactMatches = contactClauses.length
        ? await tx.contact.findMany({
            where: {
              workspaceId: workspace.id,
              deletedAt: null,
              OR: contactClauses,
            },
            take: 3,
          })
        : [];

      let contact = contactMatches.length === 1 ? contactMatches[0] : null;
      if (contactMatches.length > 1) needsReview = true;
      if (
        !contact &&
        contactMatches.length === 0 &&
        (email || phone) &&
        (input.contact?.firstName || input.contact?.lastName)
      ) {
        contact = await tx.contact.create({
          data: {
            workspaceId: workspace.id,
            companyId: company?.id,
            firstName: input.contact.firstName ?? "",
            lastName: input.contact.lastName ?? "",
            email,
            phone,
            status: "NEW",
          },
        });
      }

      if (contact?.companyId && company && contact.companyId !== company.id) {
        contact = null;
        needsReview = true;
      }
      if (!company && contact?.companyId) {
        company = await tx.company.findFirst({
          where: {
            id: contact.companyId,
            workspaceId: workspace.id,
            deletedAt: null,
          },
        });
      }

      const source = await tx.leadSource.upsert({
        where: {
          workspaceId_key: {
            workspaceId: workspace.id,
            key: input.source.name.toLowerCase(),
          },
        },
        update: {},
        create: {
          workspaceId: workspace.id,
          key: input.source.name.toLowerCase(),
          name: input.source.name,
          method: input.source.type.toUpperCase(),
          sourceUrl: normalizeUrl(input.source.url),
          active: true,
          legalNotes:
            "Imported through the authenticated universal lead import API.",
        },
      });

      const budgetMinor = moneyToMinor(
        input.lead.budgetMax ?? input.lead.budgetMin,
      );
      const currency = input.lead.currency ?? workspace.currency;
      const scoring = scoreLead({
        text: `${input.lead.title} ${input.lead.description ?? ""}`,
        email,
        budgetMinor,
        publishedAt: input.lead.publishedAt
          ? new Date(input.lead.publishedAt)
          : undefined,
      });
      const lead = await tx.lead.create({
        data: {
          workspaceId: workspace.id,
          sourceId: source.id,
          companyId: company?.id,
          contactId: contact?.id,
          title: input.lead.title,
          description: input.lead.description,
          originalText: input.lead.description,
          sourceUrl: normalizeUrl(input.source.url),
          serviceCategory: input.lead.category,
          budgetMinor,
          budgetCurrency: budgetMinor === undefined ? undefined : currency,
          publishedAt: input.lead.publishedAt
            ? new Date(input.lead.publishedAt)
            : undefined,
          score: scoring.score,
          scoreReasons: json(scoring.reasons),
          status: "REVIEW",
        },
      });

      await tx.rawLeadRecord.create({
        data: {
          leadId: lead.id,
          externalId: input.source.externalId,
          payload: json(input),
          payloadHash: dedupeKey,
        },
      });
      await tx.importEvent.update({
        where: { id: importEvent.id },
        data: { leadId: lead.id, processedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          action: "lead.imported",
          recordType: "Lead",
          recordId: lead.id,
          source: "API",
          requestId: importEvent.id,
          newValue: json({
            source: input.source.name,
            importId: importEvent.id,
            companyId: company?.id,
            contactId: contact?.id,
            needsReview,
          }),
        },
      });
      return { duplicate: false, leadId: lead.id, importId: importEvent.id };
    });

    if (!result.duplicate) {
      const [lead, owner] = await Promise.all([
        prisma.lead.findUnique({
          where: { id: result.leadId },
          select: {
            id: true,
            title: true,
            score: true,
            companyId: true,
            contactId: true,
            assigneeId: true,
          },
        }),
        prisma.user.findFirst({
          where: { workspaceId: workspace.id, status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        }),
      ]);
      if (lead) {
        await emitAutomationEvent({
          workspaceId: workspace.id,
          eventId: `lead:${lead.id}`,
          event: "lead.created",
          payload: {
            leadId: lead.id,
            ownerId: lead.assigneeId ?? owner?.id,
            title: lead.title,
            score: lead.score,
            companyId: lead.companyId,
            contactId: lead.contactId,
          },
        }).catch(() => undefined);
      }
    }
    return result;
  } catch (error) {
    await prisma.importEvent
      .update({
        where: { id: importEvent.id },
        data: {
          status: "FAILED",
          processedAt: new Date(),
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unexpected processing error",
        },
      })
      .catch(() => undefined);
    throw error;
  }
}
