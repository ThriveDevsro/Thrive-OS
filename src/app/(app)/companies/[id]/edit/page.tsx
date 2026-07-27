import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/role-access";
import { EditCompanyForm } from "./edit-company-form";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace } = await requireFounder();
  const company = await prisma.company.findFirst({
    where: { id, workspaceId: workspace.id, deletedAt: null },
  });
  if (!company) notFound();
  return (
    <div className="company-create">
      <Link href={`/companies/${id}`} className="back-link">
        <ChevronLeft size={15} /> {company.name}
      </Link>
      <section className="company-create-card">
        <header>
          <span><Pencil size={20} /></span>
          <div>
            <h1>Edit company</h1>
            <p>Update company contact and business information.</p>
          </div>
        </header>
        <EditCompanyForm company={company} />
      </section>
    </div>
  );
}
