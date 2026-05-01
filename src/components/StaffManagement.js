import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PageContainer from "./ui/PageContainer";
import { STAFF_ROLE_OPTIONS, formatRoleLabel } from "../access";
import { API_BASE_URL } from "../config";

const ATTENDANCE_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LEAVE", label: "Leave" },
  { value: "HALF_DAY", label: "Half Day" },
  { value: "OFF_DUTY", label: "Off Duty" }
];

const SALARY_TYPE_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "DAILY", label: "Daily" },
  { value: "HOURLY", label: "Hourly" }
];

const createInitialForm = () => ({
  name: "",
  email: "",
  phone: "",
  role: "CASHIER",
  password: "",
  employeeCode: "",
  salaryAmount: "",
  salaryType: "MONTHLY",
  joinedOn: ""
});

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDateInput = (value) => {
  if (!value) return "";
  return String(value).split("T")[0];
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const createDraft = (member) => ({
  name: member.name || "",
  phone: member.phone || "",
  role: member.role || "CASHIER",
  isActive: member.isActive !== false,
  employeeCode: member.employment?.employeeCode || "",
  salaryAmount: String(member.employment?.salaryAmount ?? 0),
  salaryType: member.employment?.salaryType || "MONTHLY",
  joinedOn: formatDateInput(member.employment?.joinedOn),
  attendanceStatus: member.attendance?.status || "PRESENT",
  presentDays: String(member.attendance?.presentDays ?? 0),
  absentDays: String(member.attendance?.absentDays ?? 0),
  leaveDays: String(member.attendance?.leaveDays ?? 0),
  punctualityScore: String(member.attendance?.punctualityScore ?? 100),
  performanceRating: String(member.performance?.rating ?? 0),
  performanceScore: String(member.performance?.score ?? 0),
  completedOrders: String(member.performance?.completedOrders ?? 0),
  performanceNotes: member.performance?.notes || ""
});

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [form, setForm] = useState(createInitialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");

  const loadStaff = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/staff`);
      const nextStaff = Array.isArray(res.data) ? res.data : [];
      setStaff(nextStaff);
      setDrafts(
        nextStaff.reduce((acc, member) => {
          acc[member.id] = createDraft(member);
          return acc;
        }, {})
      );
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateDraft = (memberId, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [key]: value
      }
    }));
  };

  const createStaff = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      alert("Name, email and password are required");
      return;
    }

    try {
      setSaving(true);
      await axios.post(`${API_BASE_URL}/api/staff`, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        role: form.role,
        password: form.password,
        employeeCode: form.employeeCode.trim(),
        salaryAmount: toNumber(form.salaryAmount),
        salaryType: form.salaryType,
        joinedOn: form.joinedOn || null
      });

      setForm(createInitialForm());
      await loadStaff();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to create staff user");
    } finally {
      setSaving(false);
    }
  };

  const saveMember = async (member) => {
    const draft = drafts[member.id];
    if (!draft) {
      return;
    }

    try {
      setUpdatingId(member.id);
      await axios.put(`${API_BASE_URL}/api/staff/${member.id}`, {
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        role: draft.role,
        isActive: draft.isActive,
        employeeCode: draft.employeeCode.trim(),
        salaryAmount: toNumber(draft.salaryAmount),
        salaryType: draft.salaryType,
        joinedOn: draft.joinedOn || null,
        attendanceStatus: draft.attendanceStatus,
        presentDays: toNumber(draft.presentDays),
        absentDays: toNumber(draft.absentDays),
        leaveDays: toNumber(draft.leaveDays),
        punctualityScore: toNumber(draft.punctualityScore, 100),
        performanceRating: toNumber(draft.performanceRating),
        performanceScore: toNumber(draft.performanceScore),
        completedOrders: toNumber(draft.completedOrders),
        performanceNotes: draft.performanceNotes.trim()
      });

      await loadStaff();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to update staff member");
    } finally {
      setUpdatingId("");
    }
  };

  const totals = useMemo(() => {
    return staff.reduce(
      (acc, member) => {
        acc.active += member.isActive !== false ? 1 : 0;
        acc.payroll += Number(member.employment?.salaryAmount || 0);
        acc.avgPerformance += Number(member.performance?.score || 0);
        return acc;
      },
      { active: 0, payroll: 0, avgPerformance: 0 }
    );
  }, [staff]);

  const averagePerformance = staff.length
    ? Math.round((totals.avgPerformance / staff.length) * 10) / 10
    : 0;

  return (
    <PageContainer>
      <div style={header}>
        <div>
          <h2 style={title}>Staff Management</h2>
          <p style={subtitle}>
            Manage roles, attendance, salary, and performance for your restaurant team.
          </p>
        </div>

        <div style={statsRow}>
          <div style={statCard}>
            <span style={statLabel}>Active Staff</span>
            <strong style={statValue}>{totals.active}</strong>
          </div>
          <div style={statCard}>
            <span style={statLabel}>Monthly Payroll</span>
            <strong style={statValue}>{formatCurrency(totals.payroll)}</strong>
          </div>
          <div style={statCard}>
            <span style={statLabel}>Avg Performance</span>
            <strong style={statValue}>{averagePerformance}%</strong>
          </div>
        </div>
      </div>

      <section style={panel}>
        <h3 style={panelTitle}>Add Staff User</h3>
        <div style={formGrid}>
          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={updateField}
            style={input}
          />
          <input
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={updateField}
            style={input}
          />
          <input
            name="phone"
            placeholder="Phone"
            value={form.phone}
            onChange={updateField}
            style={input}
          />
          <select name="role" value={form.role} onChange={updateField} style={input}>
            {STAFF_ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <input
            name="employeeCode"
            placeholder="Employee Code"
            value={form.employeeCode}
            onChange={updateField}
            style={input}
          />
          <input
            name="salaryAmount"
            type="number"
            placeholder="Salary Amount"
            value={form.salaryAmount}
            onChange={updateField}
            style={input}
          />
          <select
            name="salaryType"
            value={form.salaryType}
            onChange={updateField}
            style={input}
          >
            {SALARY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            name="joinedOn"
            type="date"
            value={form.joinedOn}
            onChange={updateField}
            style={input}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={updateField}
            style={input}
          />
          <button style={saveBtn} onClick={createStaff} disabled={saving}>
            {saving ? "Saving..." : "Create Staff"}
          </button>
        </div>
      </section>

      <section style={panel}>
        <div style={panelHeader}>
          <h3 style={panelTitle}>Team Overview</h3>
          {loading ? <span style={hint}>Loading staff...</span> : null}
        </div>

        {!staff.length ? (
          <p style={hint}>No staff users yet.</p>
        ) : (
          <div style={staffGrid}>
            {staff.map((member) => {
              const draft = drafts[member.id] || createDraft(member);
              const isOwner = member.role === "OWNER";

              return (
                <article key={member.id} style={staffCard}>
                  <div style={staffCardHeader}>
                    <div>
                      <h4 style={staffName}>{member.name}</h4>
                      <div style={staffEmail}>{member.email}</div>
                    </div>
                    <div style={statusStack}>
                      <span style={roleChip}>{formatRoleLabel(member.role)}</span>
                      <span
                        style={{
                          ...availabilityChip,
                          ...(draft.isActive ? availabilityChipActive : availabilityChipInactive)
                        }}
                      >
                        {draft.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div style={cardGrid}>
                    <label style={field}>
                      <span style={fieldLabel}>Role</span>
                      <select
                        value={draft.role}
                        onChange={(event) => updateDraft(member.id, "role", event.target.value)}
                        style={input}
                        disabled={isOwner}
                      >
                        {isOwner ? (
                          <option value="OWNER">Owner</option>
                        ) : (
                          STAFF_ROLE_OPTIONS.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))
                        )}
                      </select>
                    </label>

                    <label style={field}>
                      <span style={fieldLabel}>Phone</span>
                      <input
                        value={draft.phone}
                        onChange={(event) => updateDraft(member.id, "phone", event.target.value)}
                        style={input}
                        disabled={isOwner}
                      />
                    </label>

                    <label style={field}>
                      <span style={fieldLabel}>Employee Code</span>
                      <input
                        value={draft.employeeCode}
                        onChange={(event) =>
                          updateDraft(member.id, "employeeCode", event.target.value)
                        }
                        style={input}
                        disabled={isOwner}
                      />
                    </label>

                    <label style={field}>
                      <span style={fieldLabel}>Joined On</span>
                      <input
                        type="date"
                        value={draft.joinedOn}
                        onChange={(event) => updateDraft(member.id, "joinedOn", event.target.value)}
                        style={input}
                        disabled={isOwner}
                      />
                    </label>

                    <label style={field}>
                      <span style={fieldLabel}>Attendance</span>
                      <select
                        value={draft.attendanceStatus}
                        onChange={(event) =>
                          updateDraft(member.id, "attendanceStatus", event.target.value)
                        }
                        style={input}
                        disabled={isOwner}
                      >
                        {ATTENDANCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={field}>
                      <span style={fieldLabel}>Present Days</span>
                      <input
                        type="number"
                        value={draft.presentDays}
                        onChange={(event) => updateDraft(member.id, "presentDays", event.target.value)}
                        style={input}
                        disabled={isOwner}
                      />
                    </label>

                    <label style={field}>
                      <span style={fieldLabel}>Absent Days</span>
                      <input
                        type="number"
                        value={draft.absentDays}
                        onChange={(event) => updateDraft(member.id, "absentDays", event.target.value)}
                        style={input}
                        disabled={isOwner}
                      />
                    </label>

                    <label style={field}>
                      <span style={fieldLabel}>Leave Days</span>
                      <input
                        type="number"
                        value={draft.leaveDays}
                        onChange={(event) => updateDraft(member.id, "leaveDays", event.target.value)}
                        style={input}
                        disabled={isOwner}
                      />
                    </label>

                    <label style={field}>
                      <span style={fieldLabel}>Salary</span>
                      <input
                        type="number"
                        value={draft.salaryAmount}
                        onChange={(event) => updateDraft(member.id, "salaryAmount", event.target.value)}
                        style={input}
                        disabled={isOwner}
                      />
                    </label>

                    <label style={field}>
                      <span style={fieldLabel}>Salary Type</span>
                      <select
                        value={draft.salaryType}
                        onChange={(event) => updateDraft(member.id, "salaryType", event.target.value)}
                        style={input}
                        disabled={isOwner}
                      >
                        {SALARY_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={field}>
                      <span style={fieldLabel}>Performance Rating</span>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={draft.performanceRating}
                        onChange={(event) =>
                          updateDraft(member.id, "performanceRating", event.target.value)
                        }
                        style={input}
                        disabled={isOwner}
                      />
                    </label>

                    <label style={field}>
                      <span style={fieldLabel}>Performance Score</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={draft.performanceScore}
                        onChange={(event) =>
                          updateDraft(member.id, "performanceScore", event.target.value)
                        }
                        style={input}
                        disabled={isOwner}
                      />
                    </label>

                    <label style={field}>
                      <span style={fieldLabel}>Completed Orders</span>
                      <input
                        type="number"
                        value={draft.completedOrders}
                        onChange={(event) =>
                          updateDraft(member.id, "completedOrders", event.target.value)
                        }
                        style={input}
                        disabled={isOwner}
                      />
                    </label>
                  </div>

                  <label style={field}>
                    <span style={fieldLabel}>Performance Notes</span>
                    <textarea
                      value={draft.performanceNotes}
                      onChange={(event) =>
                        updateDraft(member.id, "performanceNotes", event.target.value)
                      }
                      style={textarea}
                      disabled={isOwner}
                    />
                  </label>

                  <div style={cardActions}>
                    <button
                      style={{
                        ...toggleBtn,
                        ...(draft.isActive ? toggleBtnActive : toggleBtnInactive)
                      }}
                      onClick={() => updateDraft(member.id, "isActive", !draft.isActive)}
                      disabled={isOwner}
                    >
                      {draft.isActive ? "Set Inactive" : "Set Active"}
                    </button>
                    <button
                      style={saveBtn}
                      onClick={() => saveMember(member)}
                      disabled={isOwner || updatingId === member.id}
                    >
                      {updatingId === member.id ? "Saving..." : isOwner ? "Owner" : "Save"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </PageContainer>
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

const statsRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
  width: "min(480px, 100%)"
};

const statCard = {
  border: "1px solid #2f3547",
  borderRadius: 12,
  background: "#121620",
  padding: 12,
  display: "grid",
  gap: 6
};

const statLabel = {
  color: "#91a0bf",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.4
};

const statValue = {
  color: "#f2f5fb",
  fontSize: 20,
  fontWeight: 800
};

const panel = {
  border: "1px solid #2a2d38",
  background: "#151821",
  borderRadius: 16,
  padding: 16,
  marginBottom: 14
};

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap"
};

const panelTitle = {
  margin: 0,
  color: "#eef2fb",
  fontSize: 18
};

const formGrid = {
  marginTop: 12,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10
};

const input = {
  height: 40,
  borderRadius: 10,
  border: "1px solid #343949",
  background: "#0f1218",
  color: "#ecf1fa",
  padding: "0 12px",
  outline: 0
};

const textarea = {
  minHeight: 92,
  borderRadius: 10,
  border: "1px solid #343949",
  background: "#0f1218",
  color: "#ecf1fa",
  padding: "10px 12px",
  outline: 0,
  resize: "vertical"
};

const field = {
  display: "grid",
  gap: 6
};

const fieldLabel = {
  color: "#95a0ba",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.35
};

const saveBtn = {
  height: 40,
  border: 0,
  borderRadius: 10,
  background: "#38c98f",
  color: "#102519",
  fontWeight: 800,
  cursor: "pointer",
  padding: "0 14px"
};

const hint = {
  margin: 0,
  color: "#99a4bc",
  fontSize: 13
};

const staffGrid = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 14
};

const staffCard = {
  border: "1px solid #2f3547",
  borderRadius: 14,
  background: "#11151d",
  padding: 14,
  display: "grid",
  gap: 12
};

const staffCardHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start"
};

const staffName = {
  margin: 0,
  color: "#eef2fb",
  fontSize: 18
};

const staffEmail = {
  color: "#95a0ba",
  fontSize: 13,
  marginTop: 4
};

const statusStack = {
  display: "grid",
  gap: 8,
  justifyItems: "end"
};

const roleChip = {
  borderRadius: 999,
  border: "1px solid rgba(244,201,58,0.35)",
  background: "rgba(244,201,58,0.12)",
  color: "#f4c93a",
  fontSize: 11,
  fontWeight: 800,
  padding: "6px 10px"
};

const availabilityChip = {
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 800,
  padding: "6px 10px",
  border: "1px solid transparent"
};

const availabilityChipActive = {
  color: "#3ddf9b",
  borderColor: "rgba(61,223,155,0.35)",
  background: "rgba(61,223,155,0.12)"
};

const availabilityChipInactive = {
  color: "#ff9f9f",
  borderColor: "rgba(255,159,159,0.35)",
  background: "rgba(255,159,159,0.12)"
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10
};

const cardActions = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap"
};

const toggleBtn = {
  height: 40,
  borderRadius: 10,
  border: "1px solid #3b4155",
  fontSize: 12,
  fontWeight: 700,
  padding: "0 12px",
  cursor: "pointer"
};

const toggleBtnActive = {
  background: "#232838",
  color: "#d9e1f1"
};

const toggleBtnInactive = {
  background: "#352128",
  color: "#ffd7de",
  borderColor: "#664550"
};
