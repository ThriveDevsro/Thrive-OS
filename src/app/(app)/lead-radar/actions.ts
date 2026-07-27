"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getAccessContextOrNull } from "@/lib/role-access";
const context = getAccessContextOrNull;
const input = z.object({
  title: z.string().trim().min(3, "Enter at least 3 characters."),
  description: z.string().trim().min(10, "Add a little more detail."),
  sourceUrl: z.string().url("Enter a valid source URL.").optional().or(z.literal("")).transform((value) => value || undefined),
  email: z.string().email("Enter a valid email.").optional().or(z.literal("")).transform((value) => value || undefined),
  companyName: z.string().trim().max(160).optional().transform((value) => value || undefined),
  country: z.enum(["SK", "CZ", "GB"]),
  serviceCategory: z.string().min(2),
});

export type ManualLeadState = {
  message?: string;
  errors?: Record<string, string[]>;
};

export async function createManualLead(
  _state: ManualLeadState,
  formData: FormData,
): Promise<ManualLeadState> {
  const ctx = await context();
  if (!ctx) return { message: "Your session has expired. Sign in again." };
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const manual = await tx.leadSource.upsert({
        where: {
          workspaceId_key: { workspaceId: ctx.workspace.id, key: "manual" },
        },
        update: { active: true },
        create: {
          workspaceId: ctx.workspace.id,
          key: "manual",
          name: "Manual",
          method: "MANUAL",
          active: true,
        },
      });
      let company = null;
      let companyCreated = false;
      if (parsed.data.companyName) {
        company = await tx.company.findFirst({
            where: {
              workspaceId: ctx.workspace.id,
              deletedAt: null,
              name: {
                equals: parsed.data.companyName,
                mode: "insensitive",
              },
            },
          });
        if (!company) {
          company = await tx.company.create({
            data: {
              workspaceId: ctx.workspace.id,
              ownerId: ctx.user.id,
              name: parsed.data.companyName,
              country: parsed.data.country,
            },
          });
          companyCreated = true;
        }
      }
      const lead = await tx.lead.create({
        data: {
          workspaceId: ctx.workspace.id,
          sourceId: manual.id,
          companyId: company?.id,
          assigneeId: ctx.user.id,
          title: parsed.data.title,
          description: parsed.data.description,
          originalText: parsed.data.description,
          sourceUrl: parsed.data.sourceUrl,
          country: parsed.data.country,
          serviceCategory: parsed.data.serviceCategory,
          score: 0,
          scoreReasons: [],
          status: "REVIEW",
        },
      });
      const payload = { ...parsed.data, email: parsed.data.email ?? null };
      await tx.rawLeadRecord.create({
        data: {
          leadId: lead.id,
          externalId: `manual-${lead.id}`,
          payload,
          payloadHash: lead.id,
        },
      });
      await tx.importEvent.create({
        data: {
          workspaceId: ctx.workspace.id,
          sourceName: "Manual",
          sourceType: "MANUAL",
          externalId: `manual-${lead.id}`,
          sourceUrl: parsed.data.sourceUrl,
          dedupeKey: lead.id,
          canonicalKey: `manual:${lead.id}`,
          status: "NEW",
          leadId: lead.id,
          metadata: {
            country: lead.country,
            serviceCategory: lead.serviceCategory,
          },
          rawPayload: payload,
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: ctx.workspace.id,
          userId: ctx.user.id,
          action: "lead.created",
          recordType: "Lead",
          recordId: lead.id,
          source: "MANUAL",
          newValue: { title: lead.title },
        },
      });
      if (company && companyCreated) {
        await tx.auditLog.create({
          data: {
            workspaceId: ctx.workspace.id,
            userId: ctx.user.id,
            action: "company.created_from_lead",
            recordType: "Company",
            recordId: company.id,
            source: "MANUAL",
            newValue: { name: company.name, leadId: lead.id },
          },
        });
      }
    });
  } catch {
    return { message: "The lead could not be saved. Please try again." };
  }

  revalidatePath("/lead-radar");
  redirect("/lead-radar");
}
export async function assignLead(formData:FormData){const ctx=await context();if(!ctx)return;const id=String(formData.get("id")??"");const assigneeId=String(formData.get("assigneeId")??"");const [user,lead]=await Promise.all([prisma.user.findFirst({where:{id:assigneeId,workspaceId:ctx.workspace.id,status:"ACTIVE"}}),prisma.lead.findFirst({where:{id,workspaceId:ctx.workspace.id}})]);if(!user||!lead)return;await prisma.$transaction([prisma.lead.update({where:{id},data:{assigneeId,status:"ASSIGNED"}}),prisma.auditLog.create({data:{workspaceId:ctx.workspace.id,userId:ctx.user.id,action:"lead.assigned",recordType:"Lead",recordId:id,source:"MANUAL",newValue:{assigneeId}}})]);revalidatePath("/lead-radar")}

export async function setImportDecision(formData:FormData){
  const ctx=await context();if(!ctx)return;
  const parsed=z.object({importId:z.string().uuid(),decision:z.enum(["ACCEPTED","REJECTED"])}).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return;
  const event=await prisma.importEvent.findFirst({where:{id:parsed.data.importId,workspaceId:ctx.workspace.id,status:"NEW"}});
  if(!event?.leadId)return;
  await prisma.$transaction([
    prisma.importEvent.update({where:{id:event.id},data:{status:parsed.data.decision,processedAt:new Date()}}),
    ...(parsed.data.decision==="REJECTED"?[prisma.lead.update({where:{id:event.leadId},data:{status:"REJECTED"}})]:[]),
    prisma.auditLog.create({data:{workspaceId:ctx.workspace.id,userId:ctx.user.id,action:`lead.import.${parsed.data.decision.toLowerCase()}`,recordType:"Lead",recordId:event.leadId,source:"MANUAL",requestId:event.id}}),
  ]);
  revalidatePath("/lead-radar");
}

export async function createDealFromLead(formData:FormData){
  const ctx=await context();if(!ctx)return;
  const parsed=z.object({leadId:z.string().uuid(),importId:z.string().uuid()}).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return;
  const [lead,stage]=await Promise.all([
    prisma.lead.findFirst({where:{id:parsed.data.leadId,workspaceId:ctx.workspace.id},include:{company:true}}),
    prisma.opportunityStage.findFirst({where:{workspaceId:ctx.workspace.id,terminal:false},orderBy:{position:"asc"}}),
  ]);
  if(!lead?.companyId||!stage)return;
  const due=new Date();due.setDate(due.getDate()+2);
  await prisma.$transaction(async tx=>{
    const deal=await tx.opportunity.create({data:{workspaceId:ctx.workspace.id,companyId:lead.companyId!,ownerId:ctx.user.id,stageId:stage.id,name:lead.title,valueMinor:lead.budgetMinor??BigInt(0),currency:lead.budgetCurrency??ctx.workspace.currency,probability:stage.probability,nextStep:"Review imported request",nextStepAt:due}});
    await tx.lead.update({where:{id:lead.id},data:{status:"QUALIFIED",assigneeId:ctx.user.id}});
    await tx.importEvent.updateMany({where:{id:parsed.data.importId,workspaceId:ctx.workspace.id},data:{status:"ACCEPTED",processedAt:new Date()}});
    await tx.auditLog.create({data:{workspaceId:ctx.workspace.id,userId:ctx.user.id,action:"opportunity.created_from_import",recordType:"Opportunity",recordId:deal.id,source:"MANUAL",newValue:{leadId:lead.id,companyId:lead.companyId}}});
  });
  revalidatePath("/lead-radar");revalidatePath("/deals");
}

const bulkInput = z.object({
  importIds: z.string().transform((value) => {
    try {
      return z.array(z.string().uuid()).min(1).max(100).parse(JSON.parse(value));
    } catch {
      return [];
    }
  }).refine((value) => value.length > 0),
  operation: z.enum(["ACCEPT", "REJECT", "ASSIGN"]),
  assigneeId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || undefined),
});

export async function bulkLeadAction(formData: FormData) {
  const ctx = await context();
  if (!ctx) return;
  const parsed = bulkInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const events = await prisma.importEvent.findMany({
    where: {
      id: { in: parsed.data.importIds },
      workspaceId: ctx.workspace.id,
      leadId: { not: null },
    },
    include: { lead: { select: { id: true, assigneeId: true } } },
  });
  const allowedEvents = events.filter(
    (event) => event.lead && (ctx.founder || ctx.user.id === event.lead.assigneeId),
  );
  if (!allowedEvents.length) return;
  const leadIds = allowedEvents.flatMap((event) => event.leadId ? [event.leadId] : []);

  if (parsed.data.operation === "ASSIGN") {
    if (!parsed.data.assigneeId) return;
    const assignee = await prisma.user.findFirst({
      where: { id: parsed.data.assigneeId, workspaceId: ctx.workspace.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (!assignee) return;
    await prisma.$transaction([
      prisma.lead.updateMany({
        where: { id: { in: leadIds }, workspaceId: ctx.workspace.id },
        data: { assigneeId: assignee.id, status: "ASSIGNED" },
      }),
      prisma.auditLog.create({
        data: {
          workspaceId: ctx.workspace.id,
          userId: ctx.user.id,
          action: "lead.bulk_assigned",
          recordType: "LeadBatch",
          source: "MANUAL",
          newValue: { count: leadIds.length, assigneeId: assignee.id },
        },
      }),
    ]);
  } else {
    const decision = parsed.data.operation === "ACCEPT" ? "ACCEPTED" : "REJECTED";
    const newEvents = allowedEvents.filter((event) => event.status === "NEW");
    const newEventIds = newEvents.map((event) => event.id);
    const newLeadIds = newEvents.flatMap((event) => event.leadId ? [event.leadId] : []);
    if (!newEventIds.length) return;
    await prisma.$transaction([
      prisma.importEvent.updateMany({
        where: { id: { in: newEventIds }, workspaceId: ctx.workspace.id, status: "NEW" },
        data: { status: decision, processedAt: new Date() },
      }),
      ...(decision === "REJECTED"
        ? [prisma.lead.updateMany({
            where: { id: { in: newLeadIds }, workspaceId: ctx.workspace.id },
            data: { status: "REJECTED" as const },
          })]
        : []),
      prisma.auditLog.create({
        data: {
          workspaceId: ctx.workspace.id,
          userId: ctx.user.id,
          action: `lead.bulk_${decision.toLowerCase()}`,
          recordType: "LeadBatch",
          source: "MANUAL",
          newValue: { count: newEventIds.length },
        },
      }),
    ]);
  }

  revalidatePath("/lead-radar");
}
