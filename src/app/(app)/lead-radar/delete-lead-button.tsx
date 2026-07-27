"use client";

import { Trash2 } from "lucide-react";
import { deleteLead } from "./actions";

export function DeleteLeadButton({
  leadId,
  leadTitle,
  compact = false,
}: {
  leadId: string;
  leadTitle: string;
  compact?: boolean;
}) {
  const remove = deleteLead.bind(null, leadId);
  return (
    <form
      action={remove}
      onSubmit={(event) => {
        if (!window.confirm(`Permanently remove "${leadTitle}"?`)) {
          event.preventDefault();
        }
      }}
      className="delete-lead-form"
    >
      <button
        type="submit"
        className={`delete-lead-button ${compact ? "compact" : ""}`}
        title="Remove lead"
        aria-label={`Remove ${leadTitle}`}
      >
        <Trash2 size={15} />
        {!compact && <span>Remove</span>}
      </button>
    </form>
  );
}
