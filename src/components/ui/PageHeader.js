export default function PageHeader({ title, right }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        gap: 12,
        flexWrap: "wrap"
      }}
    >
      <h2 style={{ margin: 0 }}>{title}</h2>
      {right}
    </div>
  );
}
