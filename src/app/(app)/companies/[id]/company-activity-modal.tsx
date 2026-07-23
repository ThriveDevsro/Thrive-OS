"use client";

import { useState } from "react";
import { MessageSquareText, Phone, X } from "lucide-react";
import { addCompanyActivity } from "./actions";

type Teammate = { id: string; name: string };

export function CompanyActivityModal({
  companyId,
  teammates,
}: {
  companyId: string;
  teammates: Teammate[];
}) {
  const [kind, setKind] = useState<"NOTE" | "CALL" | null>(null);
  if (!kind) {
    return (
      <>
        <button type="button" onClick={() => setKind("NOTE")}>
          <MessageSquareText size={15} /> Add note
        </button>
        <button type="button" onClick={() => setKind("CALL")}>
          <Phone size={15} /> Log call
        </button>
      </>
    );
  }

  const isCall = kind === "CALL";
  return (
    <div className="quick-modal" role="dialog" aria-modal="true" aria-label={isCall ? "Log call" : "Add note"}>
      <button className="quick-modal-scrim" onClick={() => setKind(null)} aria-label="Close" />
      <section>
        <header>
          <div>
            <h2>{isCall ? "Log call" : "Add note"}</h2>
            <p>{isCall ? "Save the outcome and next useful detail." : "Keep the team up to date."}</p>
          </div>
          <button type="button" onClick={() => setKind(null)} aria-label="Close"><X size={18} /></button>
        </header>
        <form action={addCompanyActivity} className="quick-form">
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="kind" value={kind} />
          <label className="quick-notes company-note-input">
            <span>{isCall ? "Outcome" : "Note"}</span>
            <textarea
              name="body"
              rows={5}
              minLength={2}
              maxLength={4000}
              required
              autoFocus
              placeholder={isCall ? "What was agreed?" : "Write a short update…"}
            />
          </label>
          <label className="quick-row">
            <span>@ Notify</span>
            <select name="notifyUserId" defaultValue="">
              <option value="">Nobody</option>
              {teammates.map((teammate) => (
                <option value={teammate.id} key={teammate.id}>{teammate.name}</option>
              ))}
            </select>
          </label>
          <footer>
            <button type="button" onClick={() => setKind(null)}>Cancel</button>
            <button className="quick-save">{isCall ? "Save call" : "Add note"}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
