"use client";
import { useActionState } from "react";
import { ChevronDown, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { createCompany, type CompanyFormState } from "./actions";

const initial: CompanyFormState = {};
export function CompanyForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [state, action, pending] = useActionState(createCompany, initial);
  const field = (name: string) => state.errors?.[name]?.[0];
  return (
    <form action={action} className="record-form company-create-form">
      <div className="company-essential-fields">
        <label>
          <span>Company name</span>
          <input
            name="name"
            required
            autoFocus
            placeholder="e.g. Acme"
            aria-invalid={Boolean(field("name"))}
          />
          {field("name") && <small>{field("name")}</small>}
        </label>
        <label>
          <span>Country</span>
          <select name="country" defaultValue="SK">
            <option value="SK">Slovakia</option>
            <option value="CZ">Czechia</option>
            <option value="GB">United Kingdom</option>
          </select>
        </label>
      </div>
      <details className="company-optional">
        <summary>
          Optional details <ChevronDown size={15} />
        </summary>
        <div className="form-grid">
          <label>
            <span>Website / domain</span>
            <input
              name="domain"
              placeholder="company.sk"
              aria-invalid={Boolean(field("domain"))}
            />
            {field("domain") && <small>{field("domain")}</small>}
          </label>
          <label>
            <span>Company email</span>
            <input
              name="email"
              type="email"
              defaultValue={defaultEmail}
              placeholder="info@company.sk"
              aria-invalid={Boolean(field("email"))}
            />
            {field("email") && <small>{field("email")}</small>}
          </label>
          <label>
            <span>Phone</span>
            <input
              name="phone"
              type="tel"
              placeholder="+421 900 000 000"
              aria-invalid={Boolean(field("phone"))}
            />
            {field("phone") && <small>{field("phone")}</small>}
          </label>
          <label>
            <span>City</span>
            <input name="city" placeholder="Bratislava" />
          </label>
          <label>
            <span>Industry</span>
            <input name="industry" placeholder="e.g. Manufacturing" />
          </label>
        </div>
      </details>
      {state.message && <p className="form-message">{state.message}</p>}
      <div className="form-actions">
        <Link href="/companies">Cancel</Link>
        <button disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle className="spin" size={16} /> Creating…
            </>
          ) : (
            "Create company"
          )}
        </button>
      </div>
    </form>
  );
}
