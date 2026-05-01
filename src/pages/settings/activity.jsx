import { useActivityStore } from "../../store/activityStore";

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

export default function ActivityLogsPage() {
  const logs = useActivityStore((state) => state.logs);
  const clearLogs = useActivityStore((state) => state.clearLogs);

  return (
    <div style={page}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Settings</p>
          <h1 style={title}>Activity Logs</h1>
        </div>
        <button type="button" style={secondaryButton} onClick={clearLogs}>
          Clear Logs
        </button>
      </header>

      <section style={card}>
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>User</th>
                <th style={th}>Action</th>
                <th style={th}>Module</th>
                <th style={th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={td}>{log.userName || "System"}</td>
                  <td style={td}>{log.action}</td>
                  <td style={td}>{log.module}</td>
                  <td style={td}>{formatTime(log.timestamp)}</td>
                </tr>
              ))}
              {!logs.length ? (
                <tr>
                  <td style={emptyCell} colSpan={4}>
                    No activity logged yet.
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

const emptyCell = {
  ...td,
  textAlign: "center",
  color: "#64748b"
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
