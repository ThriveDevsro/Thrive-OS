import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CompanyForm } from "../company-form";
export default function NewCompanyPage() { return <><Link href="/companies" className="back-link"><ChevronLeft size={15} /> Companies</Link><div className="record-heading"><p className="eyebrow">NEW CRM RECORD</p><h1>Add company</h1><p>Create the organisation once. Contacts, leads, activity and opportunities will connect to this record.</p></div><section className="form-card"><CompanyForm /></section></>; }
