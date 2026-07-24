"use client";

import { useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { createManualLead } from "./actions";

export function LeadModal() {
  const [open, setOpen] = useState(false);
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
            <form action={createManualLead} className="quick-form">
              <label className="quick-title">
                <input
                  name="title"
                  required
                  autoFocus
                  placeholder="Lead or opportunity name"
                />
              </label>
              <label className="quick-description">
                <textarea
                  name="description"
                  rows={4}
                  required
                  minLength={10}
                  placeholder="Paste the request or describe what the client needs…"
                />
              </label>
              <details>
                <summary>
                  More options <ChevronDown size={14} />
                </summary>
                <div>
                  <div className="quick-row">
                    <span>Source</span>
                    <input
                      name="sourceUrl"
                      type="url"
                      placeholder="https://…"
                    />
                  </div>
                  <div className="quick-row">
                    <span>Email</span>
                    <input
                      name="email"
                      type="email"
                      placeholder="name@company.com"
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
              <footer>
                <button type="button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="quick-save">Add to radar</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
