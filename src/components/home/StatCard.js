export default function StatCard({ title, value, color }) {
  return (
    <div style={{ ...card, background: color }}>
      <h4>{title}</h4>
      <h2>{value}</h2>
    </div>
  );
}

const card = {
  padding: 20,
  borderRadius: 12,
  color: "#fff",
  width: 200
};
