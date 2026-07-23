"use server";

import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "node:crypto";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { resendConfigured, sendTeamInvitation } from "@/lib/email/resend";

export type TeamState = { ok?: string; error?: string };

async function founderContext() {
  const session = await auth();
  if (!session?.user.workspaceId || session.user.role !== "founder") return null;
  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
  });
  const actor = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      workspaceId: workspace?.id,
      status: "ACTIVE",
      roles: { some: { role: { key: "founder" } } },
    },
  });
  return workspace && actor ? { workspace, actor } : null;
}

export async function addTeamMember(
  _: TeamState,
  formData: FormData,
): Promise<TeamState> {
  const context = await founderContext();
  if (!context) return { error: "Founder permission is required." };
  if (!resendConfigured()) return { error: "Email invitations are not configured. Add the Resend variables to .env first." };
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Enter a name."),
      email: z
        .string()
        .trim()
        .email("Enter a valid email.")
        .transform((v) => v.toLowerCase()),
      roleKey: z.string().min(1),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "Check the member details.",
    };
  const [existing, role] = await Promise.all([
    prisma.user.findUnique({
      where: {
        workspaceId_email: {
          workspaceId: context.workspace.id,
          email: parsed.data.email,
        },
      },
    }),
    prisma.role.findUnique({
      where: {
        workspaceId_key: {
          workspaceId: context.workspace.id,
          key: parsed.data.roleKey,
        },
      },
    }),
  ]);
  if (existing) return { error: "A member with this email already exists." };
  if (!role) return { error: "Selected role is not available." };
  const token=randomBytes(32).toString("base64url");
  const tokenHash=createHash("sha256").update(token).digest("hex");
  const user=await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        workspaceId: context.workspace.id,
        name: parsed.data.name,
        email: parsed.data.email,
        status: "INVITED",
      },
    });
    await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
    await tx.userInvitation.create({data:{workspaceId:context.workspace.id,userId:user.id,createdById:context.actor.id,tokenHash,expiresAt:new Date(Date.now()+24*60*60*1000)}});
    return user;
  });
  try{await sendTeamInvitation({to:user.email,name:user.name,invitedBy:context.actor.name,token});}catch(error){await prisma.user.delete({where:{id:user.id}});return{error:error instanceof Error?`Invitation email failed: ${error.message}`:"Invitation email failed."};}
  await prisma.auditLog.create({data:{workspaceId:context.workspace.id,userId:context.actor.id,action:"user.invited",recordType:"User",recordId:user.id,source:"MANUAL",newValue:{email:user.email,role:role.key,expiresInHours:24}}});
  revalidatePath("/team");
  return { ok: "Invitation sent. The link expires in 24 hours." };
}

export async function updateTeamMember(formData: FormData) {
  const context = await founderContext();
  if (!context) return;
  const parsed = z
    .object({
      userId: z.string().uuid(),
      roleKey: z.string().min(1),
      status: z.enum(["ACTIVE", "INVITED", "SUSPENDED"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const member = await prisma.user.findFirst({
    where: { id: parsed.data.userId, workspaceId: context.workspace.id },
    include: { roles: { include: { role: true } } },
  });
  const role = await prisma.role.findUnique({
    where: {
      workspaceId_key: {
        workspaceId: context.workspace.id,
        key: parsed.data.roleKey,
      },
    },
  });
  if (!member || !role) return;
  if (parsed.data.status === "ACTIVE" && !member.passwordHash) return;
  const isSelf = member.id === context.actor.id;
  if (
    isSelf &&
    (parsed.data.status !== "ACTIVE" || parsed.data.roleKey !== "founder")
  )
    return;
  const isFounder = member.roles.some((item) => item.role.key === "founder");
  if (isFounder && parsed.data.roleKey !== "founder") {
    const founderCount = await prisma.user.count({
      where: {
        workspaceId: context.workspace.id,
        status: "ACTIVE",
        roles: { some: { role: { key: "founder" } } },
      },
    });
    if (founderCount <= 1) return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: member.id },
      data: { status: parsed.data.status },
    });
    await tx.userRole.deleteMany({ where: { userId: member.id } });
    await tx.userRole.create({ data: { userId: member.id, roleId: role.id } });
    await tx.auditLog.create({
      data: {
        workspaceId: context.workspace.id,
        userId: context.actor.id,
        action: "user.access.updated",
        recordType: "User",
        recordId: member.id,
        source: "MANUAL",
        newValue: { role: role.key, status: parsed.data.status },
      },
    });
  });
  revalidatePath("/team");
}
