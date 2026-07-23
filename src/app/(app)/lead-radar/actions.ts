"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { scoreLead } from "@/lib/leads/scoring";
import { z } from "zod";
import { getAccessContextOrNull } from "@/lib/role-access";
const context = getAccessContextOrNull;
const input=z.object({title:z.string().trim().min(3),description:z.string().trim().min(10),sourceUrl:z.string().url().optional().or(z.literal("")).transform(v=>v||undefined),companyName:z.string().trim().optional(),contactName:z.string().trim().optional(),email:z.string().email().optional().or(z.literal("")).transform(v=>v||undefined),country:z.enum(["SK","CZ","GB"]),serviceCategory:z.string().min(2)});
export async function createManualLead(formData:FormData){const ctx=await context();if(!ctx)return;const parsed=input.safeParse(Object.fromEntries(formData));if(!parsed.success)return;const manual=await prisma.leadSource.findUnique({where:{workspaceId_key:{workspaceId:ctx.workspace.id,key:"manual"}}});if(!manual)return;const duplicate=parsed.data.email?await prisma.contact.findFirst({where:{workspaceId:ctx.workspace.id,email:parsed.data.email}}):null;const scoring=scoreLead({text:`${parsed.data.title} ${parsed.data.description}`,email:parsed.data.email,country:parsed.data.country,duplicate:Boolean(duplicate)});await prisma.$transaction(async tx=>{const lead=await tx.lead.create({data:{workspaceId:ctx.workspace.id,sourceId:manual.id,title:parsed.data.title,description:parsed.data.description,originalText:parsed.data.description,sourceUrl:parsed.data.sourceUrl,country:parsed.data.country,serviceCategory:parsed.data.serviceCategory,score:scoring.score,scoreReasons:scoring.reasons,status:"REVIEW"}});await tx.rawLeadRecord.create({data:{leadId:lead.id,externalId:`manual-${lead.id}`,payload:{...parsed.data,email:parsed.data.email??null},payloadHash:lead.id}});await tx.auditLog.create({data:{workspaceId:ctx.workspace.id,userId:ctx.user.id,action:"lead.created",recordType:"Lead",recordId:lead.id,source:"MANUAL",newValue:{title:lead.title,score:lead.score}}})});revalidatePath("/lead-radar")}
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
