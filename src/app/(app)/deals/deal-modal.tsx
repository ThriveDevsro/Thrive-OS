"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createOpportunity } from "./actions";

export function DealModal({ companies, stages }: { companies: { id: string; name: string }[]; stages: { id: string; name: string }[] }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(() => searchParams.get("new") === "1");
  return <>
    <button className="primary-link quick-create-button" onClick={() => setOpen(true)}><Plus size={16} /> Add deal</button>
    {open && <div className="quick-modal" role="dialog" aria-modal="true" aria-label="New deal">
      <button className="quick-modal-scrim" onClick={() => setOpen(false)} aria-label="Close" />
      <section>
        <header><div><h2>New deal</h2><p>Add the essentials. Everything else can wait.</p></div><button onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button></header>
        <form action={createOpportunity} className="quick-form">
          <label className="quick-title"><input name="name" required minLength={3} placeholder="Deal name" autoFocus /></label>
          <label className="quick-row"><span>Company</span><select name="companyId" required>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className="quick-row"><span>Value</span><input name="value" type="number" min="1" required placeholder="0" /></label>
          <label className="quick-row"><span>Currency</span><select name="currency"><option>EUR</option><option>GBP</option><option>CZK</option></select></label>
          <details><summary>More options</summary><div>
            <label className="quick-row"><span>Stage</span><select name="stageId">{stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
            <label className="quick-row"><span>Next step</span><input name="nextStep" defaultValue="Initial review" /></label>
            <label className="quick-row"><span>Due</span><input name="nextStepAt" type="datetime-local" /></label>
          </div></details>
          <footer><button type="button" onClick={() => setOpen(false)}>Cancel</button><button className="quick-save">Create deal</button></footer>
        </form>
      </section>
    </div>}
  </>;
}
