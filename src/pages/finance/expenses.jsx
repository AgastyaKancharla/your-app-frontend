import { useMemo, useState } from "react";

import PermissionGuard from "../../components/PermissionGuard";
import { useActivityStore } from "../../store/activityStore";
import { useAuthStore } from "../../store/authStore";
import { useExpenseStore } from "../../store/expenseStore";
import { useOrderStore } from "../../store/orderStore";
import { calculateFinance } from "../../utils/financeEngine";
import { hasPermission } from "../../utils/permissionEngine";
import {
  DataTable,
  FinancePageShell,
  MetricCard,
  SectionCard,
  TableCell,
  formatCurrency
} from "./shared";

const EXPENSE_CATEGORIES = ["Rent", "Salary", "Ingredients", "Packaging", "Utilities", "Marketing"];

const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export default function ExpensesPage() {
  const { orders } = useOrderStore();
  const { expenses, addExpense, removeExpense } = useExpenseStore();
  const user = useAuthStore((state) => state.user);
  const rolePermissions = useAuthStore((state) => state.rolePermissions);
  const addLog = useActivityStore((state) => state.addLog);
  const finance = useMemo(() => calculateFinance(orders, expenses), [orders, expenses]);
  const [form, setForm] = useState({
    category: EXPENSE_CATEGORIES[0],
    amount: "",
    date: getTodayInputValue(),
    note: "",
    isRecurring: false
  });
  const [error, setError] = useState("");

  const updateForm = (key, value) => {
    setError("");
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!hasPermission(user, "expenses.create", rolePermissions)) {
      setError("You do not have permission to add expenses.");
      return;
    }

    if (!form.category) {
      setError("Select a category.");
      return;
    }

    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      setError("Enter an expense amount above zero.");
      return;
    }

    addExpense(form);
    addLog({
      userId: user?.id || user?._id || "",
      userName: user?.name || "User",
      action: "Expense added",
      module: "Finance",
      metadata: { category: form.category, amount: Number(form.amount) }
    });
    setForm({
      category: EXPENSE_CATEGORIES[0],
      amount: "",
      date: getTodayInputValue(),
      note: "",
      isRecurring: false
    });
  };

  const handleRemoveExpense = (expense) => {
    if (!hasPermission(user, "expenses.delete", rolePermissions)) {
      setError("You do not have permission to remove expenses.");
      return;
    }

    removeExpense(expense.id);
    addLog({
      userId: user?.id || user?._id || "",
      userName: user?.name || "User",
      action: "Expense removed",
      module: "Finance",
      metadata: { expenseId: expense.id, category: expense.category, amount: expense.amount }
    });
  };

  return (
    <FinancePageShell title="Expenses">
      <section className="mb-5 grid gap-4 md:grid-cols-3">
        <MetricCard label="Total Expenses" value={formatCurrency(finance.totalExpenses)} tone="red" />
        <MetricCard label="Daily Total" value={formatCurrency(finance.dailyExpenseTotal)} tone="amber" />
        <MetricCard label="Monthly Total" value={formatCurrency(finance.monthlyExpenseTotal)} tone="blue" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="w-full">
          <SectionCard title="Add Expense">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Category
                <select
                  value={form.category}
                  onChange={(event) => updateForm("category", event.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => updateForm("amount", event.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => updateForm("date", event.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Note
                <input
                  type="text"
                  value={form.note}
                  onChange={(event) => updateForm("note", event.target.value)}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(event) => updateForm("isRecurring", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600"
                />
                Recurring
              </label>

              {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div> : null}

              <PermissionGuard permission="expenses.create">
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white shadow transition hover:bg-slate-800"
                >
                  Add Expense
                </button>
              </PermissionGuard>
            </form>
          </SectionCard>
        </div>

        <div className="w-full">
          <SectionCard title="Expense List">
            <DataTable
              columns={["Category", "Amount", "Date", "Note", ""]}
              rows={expenses}
              emptyMessage="No expenses recorded yet."
              renderRow={(expense) => (
                <tr key={expense.id}>
                  <TableCell edge="left">
                    <span className="font-semibold text-slate-950">{expense.category}</span>
                  </TableCell>
                  <TableCell>{formatCurrency(expense.amount)}</TableCell>
                  <TableCell>{formatDate(expense.date)}</TableCell>
                  <TableCell>{expense.note || "-"}</TableCell>
                  <TableCell edge="right">
                    <PermissionGuard permission="expenses.delete">
                      <button
                        type="button"
                        onClick={() => handleRemoveExpense(expense)}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow transition hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    </PermissionGuard>
                  </TableCell>
                </tr>
              )}
            />
          </SectionCard>
        </div>
      </div>
    </FinancePageShell>
  );
}
