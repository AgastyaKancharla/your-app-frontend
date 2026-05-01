const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1
});

export const formatCurrency = (value = 0) => currencyFormatter.format(Number(value || 0));
export const formatNumber = (value = 0) => numberFormatter.format(Number(value || 0));
export const formatPercent = (value = 0) => `${percentFormatter.format(Number(value || 0))}%`;

export const toneClasses = {
  green: "border-emerald-100 bg-emerald-50 text-emerald-700",
  blue: "border-sky-100 bg-sky-50 text-sky-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  red: "border-rose-100 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-white text-slate-700"
};

export function FinancePageShell({ title, children, actions }) {
  return (
    <div className="w-full h-full p-6 space-y-6 text-slate-950">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-bold uppercase text-slate-500">
            Analytics / Finance
          </p>
          <h1 className="m-0 mt-1 font-display text-3xl font-extrabold text-slate-950">
            {title}
          </h1>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function MetricCard({ label, value, tone = "slate" }) {
  return (
    <article className={`w-full rounded-xl border p-4 shadow ${toneClasses[tone] || toneClasses.slate}`}>
      <p className="m-0 text-sm font-semibold text-slate-500">{label}</p>
      <div className="mt-2 truncate text-2xl font-extrabold text-slate-950">{value}</div>
    </article>
  );
}

export function SectionCard({ title, children, action }) {
  return (
    <section className="bg-white rounded-xl shadow p-4 w-full border border-slate-200">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="m-0 text-lg font-bold text-slate-950">{title}</h2>
        {action || null}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
      {children}
    </div>
  );
}

export function DataTable({ columns, rows, renderRow, emptyMessage }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-xs font-bold uppercase text-slate-500">
            {columns.map((column) => (
              <th key={column} className="px-3 py-1">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map(renderRow)
          ) : (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState>{emptyMessage}</EmptyState>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TableCell({ children, edge = "" }) {
  const edgeClass =
    edge === "left" ? "rounded-l-xl" : edge === "right" ? "rounded-r-xl" : "";

  return <td className={`${edgeClass} bg-slate-50 px-3 py-3 text-sm text-slate-700`}>{children}</td>;
}
