"use client";

import { useActionState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import {
  removeTeamMember,
  type TeamState,
} from "./actions";

export function RemoveMemberButton({
  userId,
  memberName,
}: {
  userId: string;
  memberName: string;
}) {
  const [state, action, pending] = useActionState<TeamState, FormData>(
    removeTeamMember,
    {},
  );

  return (
    <form
      action={action}
      className="remove-member-form"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Remove ${memberName} from Thrive OS? Their historical activity will be preserved.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Remove ${memberName}`}
        title="Remove member"
      >
        {pending ? <LoaderCircle className="spin" /> : <Trash2 />}
      </button>
      {state.error && <small>{state.error}</small>}
    </form>
  );
}
