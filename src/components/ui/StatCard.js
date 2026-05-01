import { theme } from "../../theme";

export default function StatCard({ title, value, color }) {
  return (
    <div
      style={{
        background: theme.colors[color],
        borderRadius: theme.radius.card,
        padding: 24,
        color: "#fff",
        minWidth: 220,
        boxShadow: theme.shadow.card
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.9 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>
        {value}
      </div>
    </div>
  );
}
