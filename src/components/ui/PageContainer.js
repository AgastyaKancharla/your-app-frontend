export default function PageContainer({ children }) {
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", width: "100%" }}>
      {children}
    </div>
  );
}
