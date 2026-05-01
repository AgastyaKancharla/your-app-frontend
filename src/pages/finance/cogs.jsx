import { useMemo } from "react";

import { useExpenseStore } from "../../store/expenseStore";
import { useOrderStore } from "../../store/orderStore";
import { calculateFinance } from "../../utils/financeEngine";
import {
  DataTable,
  FinancePageShell,
  MetricCard,
  SectionCard,
  TableCell,
  formatCurrency,
  formatPercent
} from "./shared";

export default function FoodCostPage() {
  const { orders } = useOrderStore();
  const { expenses } = useExpenseStore();
  const finance = useMemo(() => calculateFinance(orders, expenses), [orders, expenses]);

  return (
    <FinancePageShell title="Food Cost">
      <section className="mb-5 grid gap-4 md:grid-cols-3">
        <MetricCard label="Total COGS" value={formatCurrency(finance.cogs)} tone="amber" />
        <MetricCard label="Food Cost %" value={formatPercent(finance.foodCostPercent)} tone="blue" />
        <MetricCard label="Gross Sales" value={formatCurrency(finance.grossSales)} tone="green" />
      </section>

      <SectionCard title="Item Costing">
        <DataTable
          columns={["Item", "Revenue", "Cost", "Margin %"]}
          rows={finance.itemPerformance}
          emptyMessage="No food cost rows available yet."
          renderRow={(item) => (
            <tr key={item.id}>
              <TableCell edge="left">
                <span className="font-semibold text-slate-950">{item.name}</span>
              </TableCell>
              <TableCell>{formatCurrency(item.revenue)}</TableCell>
              <TableCell>{formatCurrency(item.cost)}</TableCell>
              <TableCell edge="right">{formatPercent(item.marginPercent)}</TableCell>
            </tr>
          )}
        />
      </SectionCard>
    </FinancePageShell>
  );
}
