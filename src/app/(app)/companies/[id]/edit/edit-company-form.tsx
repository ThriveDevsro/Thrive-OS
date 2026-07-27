"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { updateCompany } from "../../actions";
import { DeleteCompanyButton } from "./delete-company-button";

type CompanyValues = {
  id: string;
  name: string;
  country: string | null;
  domain: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  industry: string | null;
};

export function EditCompanyForm({ company }: { company: CompanyValues }) {
  const update = updateCompany.bind(null, company.id);
  const [state, action, pending] = useActionState(update, {});
  const field = (name: string) => state.errors?.[name]?.[0];
  return (
    <form action={action} className="record-form company-create-form">
      <div className="company-essential-fields">
        <label>
          <span>Company name</span>
          <input name="name" required defaultValue={company.name} />
          {field("name") && <small>{field("name")}</small>}
        </label>
        <label>
          <span>Country</span>
          <select name="country" defaultValue={company.country ?? "SK"}>
            <option value="SK">Slovakia</option>
            <option value="CZ">Czechia</option>
            <option value="GB">United Kingdom</option>
          </select>
        </label>
      </div>
      <details className="company-optional" open>
        <summary>Company details <ChevronDown size={15} /></summary>
        <div className="form-grid">
          <Field name="domain" label="Website / domain" value={company.domain} error={field("domain")} />
          <Field name="email" label="Company email" value={company.email} error={field("email")} type="email" />
          <Field name="phone" label="Phone" value={company.phone} error={field("phone")} type="tel" />
          <Field name="city" label="City" value={company.city} />
          <Field name="industry" label="Industry" value={company.industry} />
        </div>
      </details>
      {state.message && <p className="form-message">{state.message}</p>}
      <div className="company-edit-actions">
        <DeleteCompanyButton companyId={company.id} companyName={company.name} />
        <div className="form-actions">
          <Link href={`/companies/${company.id}`}>Cancel</Link>
          <button disabled={pending}>
            {pending ? <><LoaderCircle className="spin" size={16} /> Saving…</> : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  value,
  error,
  type = "text",
}: {
  name: string;
  label: string;
  value: string | null;
  error?: string;
  type?: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <input name={name} type={type} defaultValue={value ?? ""} aria-invalid={Boolean(error)} />
      {error && <small>{error}</small>}
    </label>
  );
}
