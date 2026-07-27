"use client";

import { Trash2 } from "lucide-react";
import { deleteCompany } from "../../actions";

export function DeleteCompanyButton({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const remove = deleteCompany.bind(null, companyId);
  return (
    <form
      action={remove}
      onSubmit={(event) => {
        if (!window.confirm(`Remove ${companyName} from Thrive OS?`)) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className="delete-company-button">
        <Trash2 size={15} /> Remove company
      </button>
    </form>
  );
}
