"use client";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { createCompany, type CompanyFormState } from "./actions";

const initial: CompanyFormState = {};
export function CompanyForm() {
  const [state, action, pending] = useActionState(createCompany, initial);
  const field = (name: string) => state.errors?.[name]?.[0];
  return <form action={action} className="record-form"><div className="form-grid"><label className="wide"><span>Company name *</span><input name="name" required aria-invalid={Boolean(field("name"))} />{field("name") && <small>{field("name")}</small>}</label><label><span>Domain</span><input name="domain" placeholder="company.sk" aria-invalid={Boolean(field("domain"))} />{field("domain") && <small>{field("domain")}</small>}</label><label><span>Website</span><input name="website" type="url" placeholder="https://company.sk" aria-invalid={Boolean(field("website"))} />{field("website") && <small>{field("website")}</small>}</label><label><span>Country *</span><select name="country" defaultValue="SK"><option value="SK">Slovakia</option><option value="CZ">Czechia</option><option value="GB">United Kingdom</option></select></label><label><span>City</span><input name="city" /></label><label className="wide"><span>Industry</span><input name="industry" placeholder="e.g. Manufacturing" /></label></div>{state.message && <p className="form-message">{state.message}</p>}<div className="form-actions"><Link href="/companies">Cancel</Link><button disabled={pending}>{pending ? <LoaderCircle className="spin" size={16} /> : "Create company"}</button></div></form>;
}
