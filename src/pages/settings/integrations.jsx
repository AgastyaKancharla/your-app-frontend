import { FinancePageShell, SectionCard } from "../finance/shared";

export default function IntegrationsSettingsPage() {
  return (
    <FinancePageShell title="Integrations">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Zomato / Swiggy">
          <span className="text-sm font-semibold text-slate-500">Coming Soon</span>
        </SectionCard>

        <SectionCard title="Payment Methods">
          <span className="text-sm font-semibold text-slate-500">UPI / Cash enabled</span>
        </SectionCard>
      </div>
    </FinancePageShell>
  );
}
