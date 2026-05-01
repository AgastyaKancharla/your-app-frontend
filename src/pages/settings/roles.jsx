import { MODULE_PERMISSION_MATRIX, ROLE_OPTIONS, hasPermission } from "../../utils/permissionEngine";
import { useActivityStore } from "../../store/activityStore";
import { useAuthStore } from "../../store/authStore";

const ACTIONS = ["view", "create", "edit", "delete"];

export default function RolesSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const rolePermissions = useAuthStore((state) => state.rolePermissions);
  const updateRolePermission = useAuthStore((state) => state.updateRolePermission);
  const resetRolePermissions = useAuthStore((state) => state.resetRolePermissions);
  const addLog = useActivityStore((state) => state.addLog);

  const togglePermission = (role, permission, enabled) => {
    updateRolePermission(role, permission, enabled);
    addLog({
      userId: user?.id || user?._id || "",
      userName: user?.name || "User",
      action: "Role changed",
      module: "Roles",
      metadata: { role, permission, enabled }
    });
  };

  return (
    <div style={page}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Settings</p>
          <h1 style={title}>Roles & Permissions</h1>
        </div>
        <button type="button" style={secondaryButton} onClick={resetRolePermissions}>
          Reset Defaults
        </button>
      </header>

      {ROLE_OPTIONS.map((role) => {
        const isOwner = role.value === "owner";

        return (
          <section key={role.value} style={card}>
            <div style={sectionHeader}>
              <h2 style={sectionTitle}>{role.label}</h2>
              {isOwner ? <span style={pill}>Full access</span> : null}
            </div>
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Module</th>
                    {ACTIONS.map((action) => (
                      <th key={action} style={th}>
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULE_PERMISSION_MATRIX.map((row) => (
                    <tr key={row.module}>
                      <td style={td}>
                        <strong>{row.module}</strong>
                      </td>
                      {ACTIONS.map((action) => {
                        const permission = row.actions[action];
                        const checked = permission
                          ? hasPermission({ role: role.value }, permission, rolePermissions)
                          : false;

                        return (
                          <td key={action} style={td}>
                            {permission ? (
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isOwner}
                                onChange={(event) =>
                                  togglePermission(role.value, permission, event.target.checked)
                                }
                                style={checkbox}
                                aria-label={`${role.label} ${row.module} ${action}`}
                              />
                            ) : (
                              <span style={blocked}>No</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
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

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12
};

const sectionTitle = {
  margin: 0,
  fontSize: 18
};

const pill = {
  border: "1px solid #bbf7d0",
  borderRadius: 999,
  background: "#ecfdf5",
  color: "#166534",
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 800
};

const tableWrap = {
  width: "100%",
  overflowX: "auto"
};

const table = {
  width: "100%",
  minWidth: 620,
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

const checkbox = {
  width: 18,
  height: 18,
  cursor: "pointer"
};

const blocked = {
  color: "#94a3b8",
  fontWeight: 700
};

const secondaryButton = {
  minHeight: 38,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "#ffffff",
  color: "#0f172a",
  padding: "0 12px",
  fontWeight: 800,
  cursor: "pointer"
};
