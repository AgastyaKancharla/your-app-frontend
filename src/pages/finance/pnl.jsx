import { useMemo } from "react";

import { useExpenseStore } from "../../store/expenseStore";
import { useOrderStore } from "../../store/orderStore";
import { calculateFinance } from "../../utils/financeEngine";
import {
  FinancePageShell,
  MetricCard,
  SectionCard,
  formatCurrency,
  formatPercent
} from "./shared";

function StatementRow({ label, value, tone = "text-slate-950", operator = "" }) {
  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow">
      <span className="text-lg font-extrabold text-slate-400">{operator}</span>
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <span className={`text-base font-extrabold ${tone}`}>{value}</span>
    </div>
  );
}

export default function ProfitLossPage() {
  const { orders } = useOrderStore();
  const { expenses } = useExpenseStore();
  const finance = useMemo(() => calculateFinance(orders, expenses), [orders, expenses]);

  return (
    <FinancePageShell title="Profit & Loss">
      <section className="mb-5 grid gap-4 md:grid-cols-3">
        <MetricCard label="Gross Profit" value={formatCurrency(finance.grossProfit)} tone="green" />
        <MetricCard label="Net Profit" value={formatCurrency(finance.netProfit)} tone={finance.netProfit < 0 ? "red" : "green"} />
        <MetricCard label="Profit Margin" value={formatPercent(finance.profitMarginPercent)} tone="blue" />
      </section>

      <SectionCard title="Statement">
        <div className="grid gap-3">
          <StatementRow label="Revenue" value={formatCurrency(finance.grossSales)} operator="" />
          <StatementRow label="COGS" value={formatCurrency(finance.cogs)} operator="-" tone="text-amber-700" />
          <StatementRow label="Gross Profit" value={formatCurrency(finance.grossProfit)} operator="=" tone="text-emerald-700" />
          <StatementRow label="Expenses" value={formatCurrency(finance.totalExpenses)} operator="-" tone="text-rose-700" />
          <StatementRow
            label="Net Profit"
            value={formatCurrency(finance.netProfit)}
            operator="="
            tone={finance.netProfit < 0 ? "text-rose-700" : "text-emerald-700"}
          />
        </div>
      </SectionCard>
    </FinancePageShell>
  );
}
