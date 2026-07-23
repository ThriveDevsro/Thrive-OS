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
  const workspace = await prisma.workspace.findUnique({ where: { slug: "thrive-dev" } });
  const user = await prisma.user.findFirst({ where: { workspaceId: workspace?.id, email: session.user.email ?? undefined } });
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
