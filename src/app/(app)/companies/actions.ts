"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";
import { companyInput } from "@/lib/validators/company";

export type CompanyFormState = { errors?: Record<string, string[]>; message?: string };

export async function createCompany(_: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "founder") return { message: "You do not have permission to create companies." };
  const parsed = companyInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Review the highlighted fields." };
  const workspace = await prisma.workspace.findUnique({ where: { id: session.user.workspaceId } });
  const user = await prisma.user.findFirst({ where: { id: session.user.id, workspaceId: workspace?.id } });
  if (!workspace || !user) return { message: "Workspace membership could not be resolved." };
  if (parsed.data.domain) {
    const duplicate = await prisma.company.findFirst({ where: { workspaceId: workspace.id, domain: parsed.data.domain, deletedAt: null } });
    if (duplicate) return { errors: { domain: [`This domain already belongs to ${duplicate.name}.`] }, message: "Possible duplicate detected." };
  }
  const company = await prisma.$transaction(async (tx) => {
    const created = await tx.company.create({ data: { ...parsed.data, workspaceId: workspace.id, ownerId: user.id } });
    await tx.auditLog.create({ data: { workspaceId: workspace.id, userId: user.id, action: "company.created", recordType: "Company", recordId: created.id, source: "MANUAL", newValue: { name: created.name, domain: created.domain, country: created.country } } });
    return created;
  });
  revalidatePath("/companies");
  redirect(`/companies/${company.id}`);
}

export async function updateCompany(
  companyId: string,
  _: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "founder") {
    return { message: "You do not have permission to update companies." };
  }
  const parsed = companyInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Review the highlighted fields.",
    };
  }
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      workspaceId: session.user.workspaceId,
      deletedAt: null,
    },
  });
  if (!company) return { message: "Company could not be found." };
  if (parsed.data.domain) {
    const duplicate = await prisma.company.findFirst({
      where: {
        workspaceId: session.user.workspaceId,
        domain: parsed.data.domain,
        deletedAt: null,
        NOT: { id: companyId },
      },
    });
    if (duplicate) {
      return {
        errors: {
          domain: [`This domain already belongs to ${duplicate.name}.`],
        },
        message: "Possible duplicate detected.",
      };
    }
  }
  await prisma.$transaction([
    prisma.company.update({
      where: { id: companyId },
      data: parsed.data,
    }),
    prisma.auditLog.create({
      data: {
        workspaceId: session.user.workspaceId,
        userId: session.user.id,
        action: "company.updated",
        recordType: "Company",
        recordId: companyId,
        source: "MANUAL",
        oldValue: {
          name: company.name,
          domain: company.domain,
          email: company.email,
          phone: company.phone,
        },
        newValue: {
          name: parsed.data.name,
          domain: parsed.data.domain ?? null,
          email: parsed.data.email ?? null,
          phone: parsed.data.phone ?? null,
          country: parsed.data.country,
          city: parsed.data.city ?? null,
          industry: parsed.data.industry ?? null,
        },
      },
    }),
  ]);
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}`);
}

export async function deleteCompany(companyId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "founder") return;
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      workspaceId: session.user.workspaceId,
      deletedAt: null,
    },
  });
  if (!company) return;
  const deletedAt = new Date();
  await prisma.$transaction([
    prisma.company.update({
      where: { id: companyId },
      data: { deletedAt },
    }),
    prisma.auditLog.create({
      data: {
        workspaceId: session.user.workspaceId,
        userId: session.user.id,
        action: "company.deleted",
        recordType: "Company",
        recordId: companyId,
        source: "MANUAL",
        oldValue: {
          name: company.name,
          deletedAt: company.deletedAt?.toISOString() ?? null,
        },
        newValue: { deletedAt: deletedAt.toISOString() },
      },
    }),
  ]);
  revalidatePath("/companies");
  redirect("/companies");
}
