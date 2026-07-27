import Link from "next/link";
import { Building2, ChevronLeft } from "lucide-react";
import { CompanyForm } from "../company-form";

export default async function NewCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  return (
    <div className="company-create">
      <Link href="/companies" className="back-link">
        <ChevronLeft size={15} /> Companies
      </Link>
      <section className="company-create-card">
        <header>
          <span><Building2 size={20} /></span>
          <div>
            <h1>Add company</h1>
            <p>Start with the essentials. You can add more details later.</p>
          </div>
        </header>
        <CompanyForm defaultEmail={email} />
      </section>
    </div>
  );
}
