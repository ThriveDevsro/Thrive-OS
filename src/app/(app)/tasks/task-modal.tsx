"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Plus, X } from "lucide-react";
import { createTask } from "./actions";

export function TaskModal({
  companies,
}: {
  companies: { id: string; name: string }[];
}) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(() => searchParams.get("new") === "1");
  const selectedCompany = searchParams.get("company") ?? "";
  const [due] = useState(() => localDateTime(new Date(Date.now() + 60 * 60 * 1000)));
  return (
    <>
      <button
        className="primary-link quick-create-button"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Plus size={15} />
        New task
      </button>
      {open && (
        <div
          className="quick-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Create task"
        >
          <button
            className="quick-modal-scrim"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />
          <section>
            <header>
              <div>
                <h2>New task</h2>
                <p>Add the next thing that needs to be done.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X size={19} />
              </button>
            </header>
            <form action={createTask} className="quick-form">
              <label className="quick-title">
                <input
                  name="title"
                  required
                  autoFocus
                  placeholder="What needs to be done?"
                />
              </label>
              <div className="quick-row">
                <span>Due</span>
                <input
                  type="datetime-local"
                  name="dueAt"
                  defaultValue={due}
                  required
                />
              </div>
              <details>
                <summary>
                  More options <ChevronDown size={14} />
                </summary>
                <div>
                  <div className="quick-row">
                    <span>Type</span>
                    <select name="type" defaultValue="FOLLOW_UP">
                      <option value="FOLLOW_UP">Follow up</option>
                      <option value="SEND_EMAIL">Send email</option>
                      <option value="CALL">Call</option>
                      <option value="PREPARE_PROPOSAL">Prepare proposal</option>
                      <option value="RESEARCH_COMPANY">Research company</option>
                      <option value="REVIEW_LEAD">Review lead</option>
                    </select>
                  </div>
                  <div className="quick-row">
                    <span>Priority</span>
                    <select name="priority" defaultValue="NORMAL">
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                  <div className="quick-row">
                    <span>Company</span>
                    <select name="companyId" defaultValue={selectedCompany}>
                      <option value="">Internal</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="quick-notes">
                    <span>Notes</span>
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="Optional notes"
                    />
                  </label>
                </div>
              </details>
              <footer>
                <button type="button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="quick-save">Add task</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
