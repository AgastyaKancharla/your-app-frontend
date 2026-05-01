import { useSettingsStore } from "../../store/settingsStore";
import { FinancePageShell, SectionCard } from "../finance/shared";

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-800">{label}</span>
      <input
        type="checkbox"
        className="h-5 w-5 accent-slate-950"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export default function NotificationSettingsPage() {
  const { notifications, updateNotifications } = useSettingsStore();

  return (
    <FinancePageShell title="Notifications">
      <SectionCard title="Notification Preferences">
        <div className="space-y-4">
          <Toggle
            label="Offers"
            checked={notifications.offers}
            onChange={(value) => updateNotifications({ offers: value })}
          />

          <Toggle
            label="Rewards"
            checked={notifications.rewards}
            onChange={(value) => updateNotifications({ rewards: value })}
          />

          <Toggle
            label="Updates"
            checked={notifications.updates}
            onChange={(value) => updateNotifications({ updates: value })}
          />
        </div>
      </SectionCard>
    </FinancePageShell>
  );
}
