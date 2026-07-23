"use client";

import { useEffect, useState } from "react";
import { Check, UserRoundCheck, X } from "lucide-react";
import { bulkLeadAction } from "./actions";

type Member = { id: string; name: string };

export function LeadBatchCheckbox({ id }: { id: string }) {
  return (
    <label className="lead-batch-check" aria-label="Select lead">
      <input
        type="checkbox"
        onChange={(event) => window.dispatchEvent(new CustomEvent("thrive:lead-selection", {
          detail: { id, checked: event.target.checked },
        }))}
      />
    </label>
  );
}

export function LeadBatchControls({ ids, users }: { ids: string[]; users: Member[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    const update = (event: Event) => {
      const { id, checked } = (event as CustomEvent<{ id: string; checked: boolean }>).detail;
      setSelected((current) => {
        const next = new Set(current);
        if (checked) next.add(id); else next.delete(id);
        return next;
      });
    };
    window.addEventListener("thrive:lead-selection", update);
    return () => window.removeEventListener("thrive:lead-selection", update);
  }, []);

  function selectAll(checked: boolean) {
    document.querySelectorAll<HTMLInputElement>(".lead-batch-check input").forEach((input) => {
      input.checked = checked;
    });
    setSelected(checked ? new Set(ids) : new Set());
  }

  if (!ids.length) return null;
  return (
    <div className={`lead-batch-bar ${selected.size ? "visible" : ""}`}>
      <label>
        <input
          type="checkbox"
          checked={selected.size === ids.length}
          ref={(input) => { if (input) input.indeterminate = selected.size > 0 && selected.size < ids.length; }}
          onChange={(event) => selectAll(event.target.checked)}
        />
        <span>{selected.size ? `${selected.size} selected` : "Select all"}</span>
      </label>
      {selected.size > 0 && (
        <form
          action={bulkLeadAction}
          onSubmit={(event) => {
            const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
            if (submitter?.value === "REJECT" && !window.confirm(`Reject ${selected.size} selected leads?`)) event.preventDefault();
          }}
        >
          <input type="hidden" name="importIds" value={JSON.stringify([...selected])} />
          <button name="operation" value="ACCEPT"><Check /> Accept</button>
          <button className="reject" name="operation" value="REJECT"><X /> Reject</button>
          <span className="batch-assign">
            <UserRoundCheck />
            <select name="assigneeId" defaultValue="">
              <option value="" disabled>Assign to…</option>
              {users.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}
            </select>
            <button name="operation" value="ASSIGN">Assign</button>
          </span>
        </form>
      )}
    </div>
  );
}
