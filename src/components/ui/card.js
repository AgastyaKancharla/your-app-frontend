export default function Card({ children, style }) {
  return (
    <div
      style={{
        background: "#fff",
        color: "#111827",
        borderRadius: 12,
        padding: 20,
        border: "1px solid #e5e7eb",
        boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
        marginBottom: 20,
        ...style
      }}
    >
      {children}
    </div>
  );
}
