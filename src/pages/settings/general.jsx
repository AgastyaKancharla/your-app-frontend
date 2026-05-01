import { useState } from "react";

import { useSettingsStore } from "../../store/settingsStore";
import { FinancePageShell, SectionCard } from "../finance/shared";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

export default function GeneralSettingsPage() {
  const { workspace, updateWorkspace } = useSettingsStore();
  const [saved, setSaved] = useState(false);

  const handleChange = (field) => (event) => {
    setSaved(false);
    updateWorkspace({ [field]: event.target.value });
  };

  const handleSave = () => {
    setSaved(true);
  };

  return (
    <FinancePageShell
      title="General Settings"
      actions={
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-slate-800"
        >
          {saved ? "Saved" : "Save"}
        </button>
      }
    >
      <SectionCard title="Business Information">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Kitchen Name"
            value={workspace.name}
            onChange={handleChange("name")}
          />

          <input
            className={inputClass}
            placeholder="Phone"
            value={workspace.phone}
            onChange={handleChange("phone")}
          />

          <input
            className={inputClass}
            placeholder="Email"
            value={workspace.email}
            onChange={handleChange("email")}
          />

          <input
            className={inputClass}
            placeholder="Address"
            value={workspace.address}
            onChange={handleChange("address")}
          />

          <input
            className={inputClass}
            type="time"
            value={workspace.openingTime}
            onChange={handleChange("openingTime")}
          />

          <input
            className={inputClass}
            type="time"
            value={workspace.closingTime}
            onChange={handleChange("closingTime")}
          />
        </div>
      </SectionCard>
    </FinancePageShell>
  );
}
