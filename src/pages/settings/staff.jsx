import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import API_URL from "../../config/api";
import { useActivityStore } from "../../store/activityStore";
import { useAuthStore } from "../../store/authStore";

const ROLE_OPTIONS = [
  { value: "manager", label: "Manager", apiRole: "MANAGER" },
  { value: "staff", label: "Staff", apiRole: "CASHIER" },
  { value: "delivery", label: "Delivery", apiRole: "DELIVERY_PARTNER" }
];

const defaultForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: ROLE_OPTIONS[1].value
};

const toUiRole = (role = "") => {
  const normalized = String(role || "").toUpperCase();
  if (normalized === "MANAGER") return "manager";
  if (normalized.includes("DELIVERY")) return "delivery";
  return "staff";
};

const toApiRole = (role = "") =>
  ROLE_OPTIONS.find((option) => option.value === role)?.apiRole || "CASHIER";

export default function StaffSettingsPage() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const user = useAuthStore((state) => state.user);
  const addLog = useActivityStore((state) => state.addLog);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.get(`${API_URL}/api/staff`);
      setStaff(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to load staff.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const rows = useMemo(
    () =>
      staff.map((member) => ({
        ...member,
        uiRole: toUiRole(member.role),
        status: member.isActive === false ? "Inactive" : "Active"
      })),
    [staff]
  );

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const addStaff = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: toApiRole(form.role)
      };
      const response = await axios.post(`${API_URL}/api/staff`, payload);
      const created = response.data;
      setStaff((current) => [created, ...current]);
      setForm(defaultForm);
      addLog({
        userId: user?.id || user?._id || "",
        userName: user?.name || "User",
        action: "User added",
        module: "Staff",
        metadata: { targetUserId: created?.id, role: created?.role }
      });
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to add staff user.");
    } finally {
      setSaving(false);
    }
  };

  const updateStaffAccess = async (member, updates) => {
    setMessage("");

    try {
      const response = await axios.put(`${API_URL}/api/staff/${member.id}`, updates);
      const updated = response.data;
      setStaff((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      addLog({
        userId: user?.id || user?._id || "",
        userName: user?.name || "User",
        action: updates.role ? "Role changed" : "User status changed",
        module: "Staff",
        metadata: { targetUserId: updated?.id, role: updated?.role, isActive: updated?.isActive }
      });
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to update staff user.");
    }
  };

  return (
    <div style={page}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Settings</p>
          <h1 style={title}>Staff Management</h1>
        </div>
        <button type="button" style={secondaryButton} onClick={loadStaff} disabled={loading}>
          Refresh
        </button>
      </header>

      {message ? <div style={notice}>{message}</div> : null}

      <section style={card}>
        <h2 style={sectionTitle}>Add User</h2>
        <form style={formGrid} onSubmit={addStaff}>
          <input name="name" value={form.name} onChange={updateForm} placeholder="Name" style={input} required />
          <input name="email" value={form.email} onChange={updateForm} placeholder="Email" style={input} type="email" required />
          <input name="phone" value={form.phone} onChange={updateForm} placeholder="Phone" style={input} />
          <input name="password" value={form.password} onChange={updateForm} placeholder="Temporary password" style={input} type="password" required />
          <select name="role" value={form.role} onChange={updateForm} style={input}>
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <button type="submit" style={primaryButton} disabled={saving}>
            {saving ? "Adding..." : "Add User"}
          </button>
        </form>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Users</h2>
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Role</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => (
                <tr key={member.id}>
                  <td style={td}>
                    <strong>{member.name}</strong>
                    <div style={subText}>{member.email}</div>
                  </td>
                  <td style={td}>
                    <select
                      value={member.uiRole}
                      onChange={(event) =>
                        updateStaffAccess(member, { role: toApiRole(event.target.value) })
                      }
                      style={smallSelect}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={td}>{member.status}</td>
                  <td style={td}>
                    <button
                      type="button"
                      style={secondaryButton}
                      onClick={() =>
                        updateStaffAccess(member, { isActive: member.isActive === false })
                      }
                    >
                      {member.isActive === false ? "Activate" : "Deactivate"}
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td style={emptyCell} colSpan={4}>
                    {loading ? "Loading staff..." : "No staff users found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const page = {
  width: "100%",
  display: "grid",
  gap: 20,
  color: "#0f172a"
};

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16
};

const eyebrow = {
  margin: 0,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0
};

const title = {
  margin: "4px 0 0",
  fontSize: 28,
  lineHeight: 1.2
};

const card = {
  width: "100%",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
  padding: 18
};

const sectionTitle = {
  margin: "0 0 14px",
  fontSize: 18
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  alignItems: "center"
};

const input = {
  width: "100%",
  height: 42,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "0 12px",
  color: "#0f172a",
  background: "#ffffff",
  fontWeight: 700
};

const primaryButton = {
  height: 42,
  border: 0,
  borderRadius: 10,
  background: "#020617",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer"
};

const secondaryButton = {
  minHeight: 36,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "#ffffff",
  color: "#0f172a",
  padding: "0 12px",
  fontWeight: 800,
  cursor: "pointer"
};

const notice = {
  border: "1px solid #fecaca",
  borderRadius: 12,
  background: "#fff1f2",
  color: "#be123c",
  padding: "10px 12px",
  fontSize: 14,
  fontWeight: 700
};

const tableWrap = {
  width: "100%",
  overflowX: "auto"
};

const table = {
  width: "100%",
  minWidth: 720,
  borderCollapse: "collapse"
};

const th = {
  textAlign: "left",
  color: "#64748b",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0,
  padding: "10px 12px",
  borderBottom: "1px solid #e2e8f0"
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 14
};

const subText = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 12
};

const smallSelect = {
  ...input,
  maxWidth: 180
};

const emptyCell = {
  ...td,
  textAlign: "center",
  color: "#64748b"
};
