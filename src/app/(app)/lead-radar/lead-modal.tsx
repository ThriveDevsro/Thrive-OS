"use client";

import { useActionState, useState } from "react";
import { ChevronDown, LoaderCircle, Plus, X } from "lucide-react";
import { createManualLead, type ManualLeadState } from "./actions";

const initialState: ManualLeadState = {};

export function LeadModal() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    createManualLead,
    initialState,
  );
  const field = (name: string) => state.errors?.[name]?.[0];

  return (
    <>
      <button
        className="primary-link quick-create-button"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Plus size={15} />
        Add lead
      </button>
      {open && (
        <div
          className="quick-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Add lead"
        >
          <button
            className="quick-modal-scrim"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />
          <section>
            <header>
              <div>
                <h2>New lead</h2>
                <p>Paste the request. Thrive will organise it for review.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X size={19} />
              </button>
            </header>
            <form action={action} className="quick-form">
              <label className="quick-title">
                <input
                  name="title"
                  required
                  autoFocus
                  placeholder="Lead or opportunity name"
                  aria-invalid={Boolean(field("title"))}
                />
                {field("title") && <small>{field("title")}</small>}
              </label>
              <label className="quick-description">
                <textarea
                  name="description"
                  rows={4}
                  required
                  minLength={10}
                  placeholder="Paste the request or describe what the client needs…"
                  aria-invalid={Boolean(field("description"))}
                />
                {field("description") && <small>{field("description")}</small>}
              </label>
              <details>
                <summary>
                  More options <ChevronDown size={14} />
                </summary>
                <div>
                  <div className="quick-row">
                    <span>Company</span>
                    <input
                      name="companyName"
                      placeholder="Company name"
                      aria-invalid={Boolean(field("companyName"))}
                    />
                  </div>
                  <div className="quick-row">
                    <span>Source</span>
                    <input
                      name="sourceUrl"
                      type="url"
                      placeholder="https://…"
                      aria-invalid={Boolean(field("sourceUrl"))}
                    />
                  </div>
                  <div className="quick-row">
                    <span>Email</span>
                    <input
                      name="email"
                      type="email"
                      placeholder="name@company.com"
                      aria-invalid={Boolean(field("email"))}
                    />
                  </div>
                  <div className="quick-row">
                    <span>Country</span>
                    <select name="country" defaultValue="SK">
                      <option value="SK">Slovakia</option>
                      <option value="CZ">Czechia</option>
                      <option value="GB">United Kingdom</option>
                    </select>
                  </div>
                  <div className="quick-row">
                    <span>Service</span>
                    <select
                      name="serviceCategory"
                      defaultValue="Web development"
                    >
                      <option>Web development</option>
                      <option>Custom software</option>
                      <option>CRM</option>
                      <option>Automation</option>
                      <option>AI implementation</option>
                      <option>Microsoft 365</option>
                    </select>
                  </div>
                </div>
              </details>
              {state.message && (
                <p className="quick-form-message">{state.message}</p>
              )}
              <footer>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </button>
                <button className="quick-save" disabled={pending}>
                  {pending ? (
                    <>
                      <LoaderCircle className="spin" size={15} /> Saving…
                    </>
                  ) : (
                    "Add to radar"
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
