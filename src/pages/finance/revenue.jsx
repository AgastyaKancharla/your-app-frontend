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
  formatNumber,
  formatPercent
} from "./shared";

export default function RevenuePage() {
  const { orders } = useOrderStore();
  const { expenses } = useExpenseStore();
  const finance = useMemo(() => calculateFinance(orders, expenses), [orders, expenses]);

  return (
    <FinancePageShell title="Revenue">
      <section className="mb-5 grid gap-4 md:grid-cols-3">
        <MetricCard label="Total Sales" value={formatCurrency(finance.grossSales)} tone="green" />
        <MetricCard label="Orders Count" value={formatNumber(finance.orderCount)} tone="blue" />
        <MetricCard label="AOV" value={formatCurrency(finance.aov)} tone="slate" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="w-full">
          <SectionCard title="Channel Breakdown">
            <div className="grid gap-3">
              {finance.channelBreakdown.length ? (
                finance.channelBreakdown.map((channel) => (
                  <article
                    key={channel.channel}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="m-0 text-sm font-bold text-slate-950">{channel.channel}</p>
                        <p className="m-0 mt-1 text-xs font-semibold text-slate-500">
                          {formatNumber(channel.orders)} orders
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-slate-950">
                          {formatCurrency(channel.amount)}
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                          {formatPercent(channel.percent)}
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
                  No revenue channels available yet.
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="w-full">
          <SectionCard title="Orders">
            <DataTable
              columns={["Order", "Channel", "Amount"]}
              rows={finance.revenueOrders}
              emptyMessage="No orders available yet."
              renderRow={(order) => (
                <tr key={order.id}>
                  <TableCell edge="left">
                    <span className="font-semibold text-slate-950">{order.order}</span>
                  </TableCell>
                  <TableCell>{order.channel}</TableCell>
                  <TableCell edge="right">{formatCurrency(order.amount)}</TableCell>
                </tr>
              )}
            />
          </SectionCard>
        </div>
      </div>
    </FinancePageShell>
  );
}
