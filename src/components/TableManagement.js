import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageContainer from "./ui/PageContainer";
import API_URL from "../config/api";

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "RESERVED", label: "Reserved" },
  { value: "CLEANING", label: "Cleaning" }
];

const createForm = () => ({
  code: "",
  displayName: "",
  capacity: "2",
  status: "AVAILABLE",
  notes: ""
});

export default function TableManagement() {
  const [tables, setTables] = useState([]);
  const [form, setForm] = useState(createForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadTables = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/tables`);
      setTables(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to load tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const stats = useMemo(() => {
    return tables.reduce(
      (acc, table) => {
        const status = String(table.status || "").toUpperCase();
        if (status === "AVAILABLE") acc.available += 1;
        if (status === "OCCUPIED") acc.occupied += 1;
        if (status === "RESERVED") acc.reserved += 1;
        if (status === "CLEANING") acc.cleaning += 1;
        return acc;
      },
      { available: 0, occupied: 0, reserved: 0, cleaning: 0 }
    );
  }, [tables]);

  const createTable = async () => {
    if (!form.code.trim()) {
      alert("Table code is required");
      return;
    }

    try {
      setSaving(true);
      await axios.post(`${API_URL}/api/tables`, {
        code: form.code.trim().toUpperCase(),
        displayName: form.displayName.trim(),
        capacity: Number(form.capacity || 2),
        status: form.status,
        notes: form.notes.trim()
      });
      setForm(createForm());
      await loadTables();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to create table");
    } finally {
      setSaving(false);
    }
  };

  const updateTableStatus = async (tableId, status) => {
    try {
      await axios.put(`${API_URL}/api/tables/${tableId}/status`, { status });
      await loadTables();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to update table status");
    }
  };

  const removeTable = async (tableId) => {
    if (!window.confirm("Delete this table?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/tables/${tableId}`);
      await loadTables();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to delete table");
    }
  };

  return (
    <PageContainer>
      <div style={header}>
        <div>
          <h2 style={title}>Table Management</h2>
          <p style={subtitle}>Manage dine-in tables, occupancy status, and turn-around.</p>
        </div>
        <div style={statsWrap}>
          <StatCard label="Available" value={stats.available} />
          <StatCard label="Occupied" value={stats.occupied} />
          <StatCard label="Reserved" value={stats.reserved} />
          <StatCard label="Cleaning" value={stats.cleaning} />
        </div>
      </div>

      <section style={panel}>
        <h3 style={panelTitle}>Add Table</h3>
        <div style={formGrid}>
          <input
            placeholder="Code (e.g. T1)"
            value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            style={input}
          />
          <input
            placeholder="Display name"
            value={form.displayName}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, displayName: event.target.value }))
            }
            style={input}
          />
          <input
            type="number"
            min="1"
            placeholder="Capacity"
            value={form.capacity}
            onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
            style={input}
          />
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            style={input}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <input
            placeholder="Notes"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            style={input}
          />
          <button style={saveBtn} onClick={createTable} disabled={saving}>
            {saving ? "Saving..." : "Add Table"}
          </button>
        </div>
      </section>

      <section style={panel}>
        <h3 style={panelTitle}>Floor View</h3>
        {loading ? <p style={hint}>Loading tables...</p> : null}
        {!tables.length ? (
          <p style={hint}>No tables added yet.</p>
        ) : (
          <div style={grid}>
            {tables.map((table) => (
              <article key={table._id} style={card}>
                <div style={cardHeader}>
                  <div>
                    <div style={tableCode}>{table.code}</div>
                    <div style={tableName}>{table.displayName || table.code}</div>
                  </div>
                  <span style={statusChip}>{table.status}</span>
                </div>

                <div style={meta}>Capacity: {table.capacity || 0}</div>
                {table.currentCustomerName ? (
                  <div style={meta}>Customer: {table.currentCustomerName}</div>
                ) : null}
                {table.notes ? <div style={meta}>Notes: {table.notes}</div> : null}

                <div style={actions}>
                  <select
                    value={table.status || "AVAILABLE"}
                    onChange={(event) => updateTableStatus(table._id, event.target.value)}
                    style={input}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <button style={deleteBtn} onClick={() => removeTable(table._id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={statCard}>
      <div style={statLabel}>{label}</div>
      <div style={statValue}>{value}</div>
    </div>
  );
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 14
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

const statsWrap = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(100px, 1fr))",
  gap: 10,
  width: "min(520px, 100%)"
};

const statCard = {
  border: "1px solid #2b3040",
  borderRadius: 12,
  background: "#11151f",
  padding: 10
};

const statLabel = {
  color: "#95a0b8",
  fontSize: 11
};

const statValue = {
  marginTop: 4,
  color: "#f3f6fc",
  fontWeight: 800,
  fontSize: 19
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
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 10
};

const input = {
  height: 36,
  borderRadius: 10,
  border: "1px solid #353a4b",
  background: "#10141d",
  color: "#edf1fa",
  padding: "0 10px",
  outline: 0
};

const saveBtn = {
  height: 36,
  border: 0,
  borderRadius: 10,
  background: "#38c98f",
  color: "#102519",
  fontWeight: 800,
  cursor: "pointer"
};

const hint = {
  color: "#99a4bc",
  margin: "10px 0 0"
};

const grid = {
  marginTop: 10,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10
};

const card = {
  border: "1px solid #2f3445",
  borderRadius: 12,
  background: "#111620",
  padding: 12,
  display: "grid",
  gap: 8
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "flex-start"
};

const tableCode = {
  color: "#f4c93a",
  fontSize: 12,
  fontWeight: 800
};

const tableName = {
  color: "#eef2fb",
  fontSize: 16,
  fontWeight: 800
};

const statusChip = {
  borderRadius: 999,
  border: "1px solid rgba(144,161,255,0.35)",
  color: "#90a1ff",
  background: "rgba(144,161,255,0.12)",
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 700
};

const meta = {
  color: "#a4afc8",
  fontSize: 13
};

const actions = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8
};

const deleteBtn = {
  height: 36,
  border: "1px solid #5a3b47",
  borderRadius: 10,
  background: "#2d1a22",
  color: "#ffd3db",
  fontWeight: 700,
  cursor: "pointer",
  padding: "0 12px"
};
