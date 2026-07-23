"use client";

import { useRef } from "react";
import { UserRoundCheck } from "lucide-react";
import { assignLead } from "./actions";

export function InlineLeadOwner({
  leadId,
  assigneeId,
  users,
}: {
  leadId: string;
  assigneeId: string | null;
  users: Array<{ id: string; name: string }>;
}) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <div className="lead-owner">
      <UserRoundCheck size={15} />
      <form action={assignLead} ref={form}>
        <input type="hidden" name="id" value={leadId} />
        <select
          name="assigneeId"
          aria-label="Lead owner"
          defaultValue={assigneeId ?? ""}
          onChange={() => form.current?.requestSubmit()}
        >
          <option value="" disabled>Assign owner</option>
          {users.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
        <span className="inline-saving" aria-hidden="true">Saved automatically</span>
      </form>
    </div>
  );
}
