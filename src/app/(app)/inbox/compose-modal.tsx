"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Plus, X } from "lucide-react";
import { createConversation, type ComposeState } from "./actions";

export function ComposeModal({
  draft,
}: {
  draft?: { subject: string; message: string };
}) {
  const [open, setOpen] = useState(Boolean(draft));
  const [state, action, pending] = useActionState<ComposeState, FormData>(
    createConversation,
    {},
  );
  return (
    <>
      <button
        className="primary-link quick-create-button"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Plus size={15} />
        New conversation
      </button>
      {open && (
        <div
          className="quick-modal"
          role="dialog"
          aria-modal="true"
          aria-label="New conversation"
        >
          <button
            className="quick-modal-scrim"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />
          <section>
            <header>
              <div>
                <h2>New conversation</h2>
                <p>Start an email or record an outgoing message.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X size={19} />
              </button>
            </header>
            <form action={action} className="quick-form inbox-compose-form">
              <div className="quick-row">
                <span>To</span>
                <input
                  name="recipient"
                  type="email"
                  required
                  autoFocus
                  placeholder="client@company.com"
                />
              </div>
              <label className="quick-title">
                <input
                  name="subject"
                  defaultValue={draft?.subject}
                  required
                  placeholder="Subject"
                />
              </label>
              <label className="quick-description">
                <textarea
                  name="message"
                  defaultValue={draft?.message}
                  rows={7}
                  required
                  placeholder="Write your message…"
                />
              </label>
              {state.error && <p className="team-form-error">{state.error}</p>}
              <footer>
                <button type="button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="quick-save" disabled={pending}>
                  {pending ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    "Add message"
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
