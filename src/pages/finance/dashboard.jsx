import { useMemo } from "react";

import { useExpenseStore } from "../../store/expenseStore";
import { useOrderStore } from "../../store/orderStore";
import { calculateFinance } from "../../utils/financeEngine";
import {
  DataTable,
  EmptyState,
  FinancePageShell,
  MetricCard,
  SectionCard,
  TableCell,
  formatCurrency,
  formatNumber,
  formatPercent
} from "./shared";

export default function FinanceDashboardPage() {
  const { orders } = useOrderStore();
  const { expenses } = useExpenseStore();
  const finance = useMemo(() => calculateFinance(orders, expenses), [orders, expenses]);

  return (
    <FinancePageShell title="Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Gross Sales" value={formatCurrency(finance.grossSales)} tone="green" />
        <MetricCard label="Orders" value={formatNumber(finance.orderCount)} tone="blue" />
        <MetricCard label="AOV" value={formatCurrency(finance.aov)} tone="slate" />
        <MetricCard label="COGS" value={formatCurrency(finance.cogs)} tone="amber" />
        <MetricCard label="Expenses" value={formatCurrency(finance.totalExpenses)} tone="red" />
        <MetricCard label="Net Profit" value={formatCurrency(finance.netProfit)} tone={finance.netProfit < 0 ? "red" : "green"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Alerts">
          {finance.alerts.length ? (
            <div className="space-y-3">
              {finance.alerts.map((alert) => (
                <div
                  key={alert}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow"
                >
                  {alert}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No finance alerts right now.</EmptyState>
          )}
        </SectionCard>

        <SectionCard title="Expense Breakdown">
          <DataTable
            columns={["Category", "Amount", "Share", "Entries"]}
            rows={finance.expenseBreakdown}
            emptyMessage="No expenses recorded yet."
            renderRow={(entry) => (
              <tr key={entry.category}>
                <TableCell edge="left">
                  <span className="font-semibold text-slate-950">{entry.category}</span>
                </TableCell>
                <TableCell>{formatCurrency(entry.amount)}</TableCell>
                <TableCell>{formatPercent(entry.percent)}</TableCell>
                <TableCell edge="right">{formatNumber(entry.count)}</TableCell>
              </tr>
            )}
          />
        </SectionCard>

        <SectionCard title="Top Items">
          <DataTable
            columns={["Item", "Qty", "Revenue", "Margin"]}
            rows={finance.topItems}
            emptyMessage="No order items available yet."
            renderRow={(item) => (
              <tr key={item.id}>
                <TableCell edge="left">
                  <span className="font-semibold text-slate-950">{item.name}</span>
                </TableCell>
                <TableCell>{formatNumber(item.quantity)}</TableCell>
                <TableCell>{formatCurrency(item.revenue)}</TableCell>
                <TableCell edge="right">{formatPercent(item.marginPercent)}</TableCell>
              </tr>
            )}
          />
        </SectionCard>

        <SectionCard title="Low Margin Items">
          <DataTable
            columns={["Item", "Revenue", "Cost", "Margin"]}
            rows={finance.lowMarginItems}
            emptyMessage="No margin data available yet."
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
      </div>
    </FinancePageShell>
  );
}
