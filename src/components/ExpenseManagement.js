import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageContainer from "./ui/PageContainer";
import { API_BASE_URL } from "../config";

const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Supplies",
  "Salary",
  "Maintenance",
  "Transport",
  "Marketing",
  "Other"
];

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const formatCurrency = (value) => INR_FORMATTER.format(Number(value || 0));

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const initialForm = {
  category: EXPENSE_CATEGORIES[0],
  amount: "",
  description: ""
};

export default function ExpenseManagement() {
  const [form, setForm] = useState(initialForm);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadExpenses = async (filters = {}) => {
    try {
      setLoading(true);
      const params = {};
      if (filters.from) {
        params.from = filters.from;
      }
      if (filters.to) {
        params.to = filters.to;
      }

      const res = await axios.get(`${API_BASE_URL}/api/expenses`, { params });
      const payload = res.data || {};

      setExpenses(Array.isArray(payload.expenses) ? payload.expenses : []);
      setSummary({
        totalAmount: Number(payload.totalAmount || 0),
        count: Number(payload.count || 0)
      });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addExpense = async () => {
    const amount = Number(form.amount);

    if (!form.category.trim()) {
      alert("Category is required");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Amount should be greater than 0");
      return;
    }

    try {
      setSaving(true);
      await axios.post(`${API_BASE_URL}/api/expenses`, {
        category: form.category.trim(),
        amount,
        description: form.description.trim()
      });

      setForm(initialForm);
      await loadExpenses({ from: fromDate, to: toDate });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to add expense");
    } finally {
      setSaving(false);
    }
  };

  const filteredTotal = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  }, [expenses]);

  return (
    <PageContainer>
      <div style={header}>
        <h2 style={title}>Expense Management</h2>
        <p style={subtitle}>Track daily expenses and monitor spending by category.</p>
      </div>

      <section style={panel}>
        <h3 style={panelTitle}>Add Expense</h3>
        <div style={formGrid}>
          <select name="category" value={form.category} onChange={updateField} style={input}>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={updateField}
            style={input}
          />

          <input
            name="description"
            placeholder="Description (optional)"
            value={form.description}
            onChange={updateField}
            style={input}
          />

          <button style={saveBtn} onClick={addExpense} disabled={saving}>
            {saving ? "Saving..." : "Add Expense"}
          </button>
        </div>
      </section>

      <section style={filters}>
        <div style={filterGroup}>
          <label style={label}>From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            style={dateInput}
          />
        </div>
        <div style={filterGroup}>
          <label style={label}>To</label>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            style={dateInput}
          />
        </div>
        <button
          style={applyBtn}
          onClick={() => loadExpenses({ from: fromDate, to: toDate })}
          disabled={loading}
        >
          {loading ? "Loading..." : "Apply Filter"}
        </button>
        <button
          style={clearBtn}
          onClick={() => {
            setFromDate("");
            setToDate("");
            loadExpenses();
          }}
          disabled={loading}
        >
          Clear
        </button>
      </section>

      <section style={statsRow}>
        <div style={statCard}>
          <div style={statLabel}>Total Records</div>
          <div style={statValue}>{summary.count}</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Total Spent</div>
          <div style={statValue}>{formatCurrency(summary.totalAmount)}</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Visible Total</div>
          <div style={statValue}>{formatCurrency(filteredTotal)}</div>
        </div>
      </section>

      <section style={panel}>
        <h3 style={panelTitle}>Expense History</h3>
        {!expenses.length ? (
          <p style={hint}>No expenses found for selected range.</p>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Category</th>
                  <th style={th}>Amount</th>
                  <th style={th}>Description</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td style={td}>{formatDateTime(expense.createdAt)}</td>
                    <td style={td}>{expense.category || "-"}</td>
                    <td style={td}>{formatCurrency(expense.amount)}</td>
                    <td style={td}>{expense.description || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageContainer>
  );
}

const header = {
  marginBottom: 12
};

const title = {
  margin: 0,
  color: "#f3f6fc",
  fontSize: 30
};

const subtitle = {
  margin: "6px 0 0",
  color: "#96a0b8",
  fontSize: 14
};

const panel = {
  border: "1px solid #2a2d38",
  background: "#151821",
  borderRadius: 14,
  padding: 14,
  marginBottom: 12
};

const panelTitle = {
  margin: 0,
  color: "#eef2fb",
  fontSize: 18
};

const formGrid = {
  marginTop: 10,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 10
};

const input = {
  height: 38,
  borderRadius: 8,
  border: "1px solid #343949",
  background: "#0f1218",
  color: "#ecf1fa",
  padding: "0 10px",
  outline: 0
};

const saveBtn = {
  height: 38,
  border: 0,
  borderRadius: 8,
  background: "#38c98f",
  color: "#102519",
  fontWeight: 800,
  cursor: "pointer"
};

const filters = {
  display: "flex",
  alignItems: "flex-end",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 12
};

const filterGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 6
};

const label = {
  fontSize: 12,
  color: "#99a5be"
};

const dateInput = {
  height: 36,
  borderRadius: 8,
  border: "1px solid #343949",
  background: "#0f1218",
  color: "#ecf1fa",
  padding: "0 10px",
  outline: 0
};

const applyBtn = {
  height: 36,
  border: 0,
  borderRadius: 8,
  background: "#6d7ff5",
  color: "#f5f7fd",
  fontWeight: 700,
  padding: "0 14px",
  cursor: "pointer"
};

const clearBtn = {
  height: 36,
  border: "1px solid #3d4356",
  borderRadius: 8,
  background: "#11141d",
  color: "#cdd5e7",
  fontWeight: 600,
  padding: "0 14px",
  cursor: "pointer"
};

const statsRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  marginBottom: 12
};

const statCard = {
  border: "1px solid #2b3040",
  background: "#11151f",
  borderRadius: 12,
  padding: "12px 14px"
};

const statLabel = {
  color: "#95a0b8",
  fontSize: 12
};

const statValue = {
  marginTop: 6,
  color: "#f3f6fc",
  fontSize: 24,
  fontWeight: 700
};

const hint = {
  margin: "10px 0 0",
  color: "#99a4bc",
  fontSize: 13
};

const tableWrap = {
  marginTop: 10,
  width: "100%",
  overflowX: "auto"
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 620
};

const th = {
  textAlign: "left",
  color: "#97a2bc",
  fontSize: 12,
  borderBottom: "1px solid #303547",
  padding: "10px 8px"
};

const td = {
  color: "#e5e9f3",
  fontSize: 13,
  borderBottom: "1px solid #252a39",
  padding: "11px 8px"
};
