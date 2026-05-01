import { cloudKitchenTheme } from "../../theme";

export default function CommandCenterLayout({
  commandStrip,
  quickActions,
  alertsPanel,
  liveOrderBoard,
  performancePanel,
  inventoryAlerts,
  throughputChart,
  wastagePanel,
  aiInsights
}) {
  const analyticsSections = [throughputChart, wastagePanel, aiInsights].filter(Boolean);

  return (
    <div style={page}>
      {commandStrip}

      <div style={topGrid}>
        {quickActions ? <div style={topCell}>{quickActions}</div> : null}
        {alertsPanel ? <div style={topCell}>{alertsPanel}</div> : null}
      </div>

      {liveOrderBoard}

      <div style={opsGrid}>
        {performancePanel ? <div style={sectionCell}>{performancePanel}</div> : null}
        {inventoryAlerts ? <div style={sectionCell}>{inventoryAlerts}</div> : null}
      </div>

      {analyticsSections.length ? (
        <div style={analyticsGrid}>
          {analyticsSections.map((section, index) => (
            <div key={index} style={sectionCell}>
              {section}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const page = {
  display: "grid",
  gap: 12,
  minWidth: 0
};

const topGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
  gap: 12,
  minWidth: 0
};

const topCell = {
  minWidth: 0
};

const opsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: 12,
  minWidth: 0
};

const analyticsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
  gap: 12,
  minWidth: 0
};

const sectionCell = {
  minWidth: 0,
  background: cloudKitchenTheme.card
};
