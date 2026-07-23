"use client";
import { useActionState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { updateWorkspace, type SettingsState } from "./actions";
export function WorkspaceForm({
  workspace,
}: {
  workspace: { name: string; timezone: string; currency: string };
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    updateWorkspace,
    {},
  );
  return (
    <form action={action} className="settings-form">
      <div>
        <label>
          <span>Workspace name</span>
          <input name="name" defaultValue={workspace.name} />
        </label>
        <label>
          <span>Timezone</span>
          <select name="timezone" defaultValue={workspace.timezone}>
            <option value="Europe/Bratislava">Bratislava</option>
            <option value="Europe/Prague">Prague</option>
            <option value="Europe/London">London</option>
          </select>
        </label>
        <label>
          <span>Default currency</span>
          <select name="currency" defaultValue={workspace.currency}>
            <option value="EUR">EUR</option>
            <option value="CZK">CZK</option>
            <option value="GBP">GBP</option>
          </select>
        </label>
      </div>
      {state.error && <p className="settings-error">{state.error}</p>}
      {state.ok && (
        <p className="settings-success">
          <CheckCircle2 size={14} />
          {state.ok}
        </p>
      )}
      <button disabled={pending}>
        {pending ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          "Save workspace"
        )}
      </button>
    </form>
  );
}
