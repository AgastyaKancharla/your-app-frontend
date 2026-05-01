export default function Unauthorized() {
  return (
    <div style={wrap}>
      <div style={card}>
        <p style={eyebrow}>Access restricted</p>
        <h2 style={title}>You do not have permission to view this page.</h2>
        <p style={copy}>
          Ask an owner to update your role or permissions if this workspace area should be available.
        </p>
      </div>
    </div>
  );
}

const wrap = {
  minHeight: "min(520px, 70vh)",
  display: "grid",
  placeItems: "center",
  padding: 24
};

const card = {
  width: "min(520px, 100%)",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  borderRadius: 18,
  background: "#ffffff",
  boxShadow: "0 18px 46px rgba(15, 23, 42, 0.12)",
  padding: "28px 24px",
  color: "#0f172a"
};

const eyebrow = {
  margin: "0 0 8px",
  textTransform: "uppercase",
  letterSpacing: 0,
  fontSize: 12,
  fontWeight: 800,
  color: "#64748b"
};

const title = {
  margin: "0 0 10px",
  fontSize: 24,
  lineHeight: 1.25
};

const copy = {
  margin: 0,
  color: "#475569",
  fontSize: 14,
  lineHeight: 1.6
};
