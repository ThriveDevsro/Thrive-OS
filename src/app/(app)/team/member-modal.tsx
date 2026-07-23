"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, UserPlus, X } from "lucide-react";
import { addTeamMember, type TeamState } from "./actions";

export function MemberModal({
  roles,
}: {
  roles: { key: string; name: string; description: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<TeamState, FormData>(
    addTeamMember,
    {},
  );
  return (
    <>
      <button
        className="primary-link quick-create-button"
        type="button"
        onClick={() => setOpen(true)}
      >
        <UserPlus size={15} />
        Add member
      </button>
      {open && (
        <div
          className="quick-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Add team member"
        >
          <button
            className="quick-modal-scrim"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />
          <section>
            <header>
              <div>
                <h2>Add member</h2>
                <p>Create secure access to the Thrive workspace.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X size={19} />
              </button>
            </header>
            <form action={action} className="quick-form team-quick-form">
              <label className="quick-title">
                <input name="name" required autoFocus placeholder="Full name" />
              </label>
              <div className="quick-row">
                <span>Work email</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@thrivedev.co"
                />
              </div>
              <div className="quick-row">
                <span>Role</span>
                <select name="roleKey">
                  {roles.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              {state.error && <p className="team-form-error">{state.error}</p>}
              {state.ok && <p className="team-form-success">{state.ok}</p>}
              <footer>
                <button type="button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="quick-save" disabled={pending}>
                  {pending ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    "Send invitation"
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
