import { cloudKitchenTheme } from "../../theme";

export default function DashboardSkeleton() {
  return (
    <div style={pageWrap}>
      <section style={strip}>
        <div style={metricRow}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} style={metricCard}>
              <div className="cloud-kitchen-skeleton" style={metricLabel} />
              <div className="cloud-kitchen-skeleton" style={metricValue} />
            </div>
          ))}
        </div>
        <div style={alertRow}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="cloud-kitchen-skeleton"
              style={alertChip}
            />
          ))}
        </div>
      </section>

      <section style={actionsRow}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="cloud-kitchen-skeleton"
            style={actionButton}
          />
        ))}
      </section>

      <div style={metricGrid}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} style={metricPanel}>
            <div className="cloud-kitchen-skeleton" style={shortLine} />
            <div className="cloud-kitchen-skeleton" style={largeLine} />
            <div className="cloud-kitchen-skeleton" style={mediumLine} />
          </div>
        ))}
      </div>

      <section style={kitchenPanel}>
        <div style={kitchenHeader}>
          <div className="cloud-kitchen-skeleton" style={sectionTitle} />
          <div className="cloud-kitchen-skeleton" style={sectionMeta} />
        </div>
        <div style={ordersGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} style={orderCard}>
              <div className="cloud-kitchen-skeleton" style={shortLine} />
              <div className="cloud-kitchen-skeleton" style={largeLine} />
              <div className="cloud-kitchen-skeleton" style={mediumLine} />
              <div style={orderFooter}>
                <div className="cloud-kitchen-skeleton" style={chip} />
                <div className="cloud-kitchen-skeleton" style={button} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={secondaryGrid}>
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} style={secondaryCard}>
            <div className="cloud-kitchen-skeleton" style={shortLine} />
            <div className="cloud-kitchen-skeleton" style={chartBlock} />
          </section>
        ))}
      </div>
    </div>
  );
}

const panel = {
  background: cloudKitchenTheme.card,
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 22
};

const pageWrap = {
  display: "grid",
  gap: 12,
  minWidth: 0
};

const strip = {
  ...panel,
  padding: 12
};

const metricRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 136px), 1fr))",
  gap: 8
};

const metricCard = {
  ...panel,
  background: cloudKitchenTheme.panelSoft,
  padding: 14
};

const metricLabel = {
  width: "42%",
  height: 12,
  borderRadius: 999
};

const metricValue = {
  width: "58%",
  height: 28,
  borderRadius: 10,
  marginTop: 12
};

const alertRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 14
};

const alertChip = {
  width: 180,
  height: 34,
  borderRadius: 999
};

const actionsRow = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap"
};

const actionButton = {
  height: 48,
  width: 150,
  borderRadius: 14
};

const metricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: 10
};

const metricPanel = {
  ...panel,
  padding: 18
};

const shortLine = {
  width: "36%",
  height: 12,
  borderRadius: 999
};

const largeLine = {
  width: "64%",
  height: 32,
  borderRadius: 10,
  marginTop: 12
};

const mediumLine = {
  width: "48%",
  height: 12,
  borderRadius: 999,
  marginTop: 12
};

const kitchenPanel = {
  ...panel,
  padding: 12
};

const kitchenHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 16
};

const sectionTitle = {
  width: 180,
  height: 16,
  borderRadius: 999
};

const sectionMeta = {
  width: 90,
  height: 16,
  borderRadius: 999
};

const ordersGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: 10
};

const orderCard = {
  ...panel,
  background: cloudKitchenTheme.panelSoft,
  padding: 16
};

const orderFooter = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 16
};

const chip = {
  width: 76,
  height: 28,
  borderRadius: 999
};

const button = {
  width: 118,
  height: 38,
  borderRadius: 12
};

const secondaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: 10
};

const secondaryCard = {
  ...panel,
  padding: 18
};

const chartBlock = {
  width: "100%",
  height: 160,
  borderRadius: 16,
  marginTop: 14
};
