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
  formatCurrency
} from "./shared";

export default function CashFlowPage() {
  const { orders } = useOrderStore();
  const { expenses } = useExpenseStore();
  const finance = useMemo(() => calculateFinance(orders, expenses), [orders, expenses]);
  const { cashFlow } = finance;

  return (
    <FinancePageShell title="Cash Flow">
      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Cash" value={formatCurrency(cashFlow.cash)} tone="green" />
        <MetricCard label="UPI" value={formatCurrency(cashFlow.upi)} tone="blue" />
        <MetricCard label="Online" value={formatCurrency(cashFlow.online)} tone="slate" />
        <MetricCard label="Pending Payouts" value={formatCurrency(cashFlow.pendingPayouts)} tone="amber" />
      </section>

      <SectionCard title="Receipts">
        <DataTable
          columns={["Order", "Payment", "Channel", "Amount", "Pending Payout"]}
          rows={cashFlow.entries}
          emptyMessage="No cash flow entries available yet."
          renderRow={(entry) => (
            <tr key={entry.id}>
              <TableCell edge="left">
                <span className="font-semibold text-slate-950">{entry.order}</span>
              </TableCell>
              <TableCell>{entry.paymentMethod}</TableCell>
              <TableCell>{entry.channel}</TableCell>
              <TableCell>{formatCurrency(entry.amount)}</TableCell>
              <TableCell edge="right">{formatCurrency(entry.pendingPayout)}</TableCell>
            </tr>
          )}
        />
      </SectionCard>
    </FinancePageShell>
  );
}
