import { motion } from "framer-motion";

import { cloudKitchenTheme } from "../../theme";
import { STATUS_TONES } from "./statusTheme";

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export default function WastagePanel({ series = [] }) {
  const safeSeries =
    Array.isArray(series) && series.length ? series : [{ label: "No data", cost: 0 }];
  const maxValue = Math.max(...safeSeries.map((item) => Number(item?.cost || 0)), 1);
  const totalWastage = safeSeries.reduce((sum, item) => sum + Number(item?.cost || 0), 0);
  const averageWastage = safeSeries.length ? totalWastage / safeSeries.length : 0;

  return (
    <section style={panel}>
      <div style={header}>
        <div>
          <div style={title}>Wastage</div>
          <div style={subtitle}>Loss trend from kitchen operations</div>
        </div>
        <div style={headerStats}>
          <div style={totalStat}>{INR_FORMATTER.format(totalWastage)}</div>
          <div style={avgStat}>avg {INR_FORMATTER.format(averageWastage)}</div>
        </div>
      </div>

      <div style={barGrid}>
        {safeSeries.map((item) => {
          const value = Number(item?.cost || 0);
          const heightPercent = `${Math.max(8, (value / maxValue) * 100)}%`;
          const tone = value > averageWastage ? STATUS_TONES.warning : STATUS_TONES.info;

          return (
            <div key={item.date || item.label} style={barColumn}>
              <div style={barValue}>{INR_FORMATTER.format(value)}</div>
              <div style={barTrack}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: heightPercent }}
                  transition={{ duration: 0.34, ease: "easeOut" }}
                  style={{
                    ...barFill,
                    background: `linear-gradient(180deg, ${tone.text} 0%, ${cloudKitchenTheme.warning} 100%)`
                  }}
                />
              </div>
              <div style={barLabel}>{item.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const panel = {
  background: cloudKitchenTheme.card,
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 20,
  padding: 16,
  boxShadow: cloudKitchenTheme.shadow
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 12,
  flexWrap: "wrap"
};

const title = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 15,
  fontWeight: 800
};

const subtitle = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  marginTop: 4
};

const headerStats = {
  textAlign: "right"
};

const totalStat = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 13,
  fontWeight: 800
};

const avgStat = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  marginTop: 4
};

const barGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 56px), 1fr))",
  gap: 10,
  alignItems: "end",
  minHeight: 180
};

const barColumn = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  minHeight: 160
};

const barValue = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 10,
  textAlign: "center"
};

const barTrack = {
  width: "100%",
  flex: 1,
  borderRadius: 14,
  background: cloudKitchenTheme.panelSoft,
  display: "flex",
  alignItems: "flex-end",
  overflow: "hidden",
  border: `1px solid ${cloudKitchenTheme.border}`
};

const barFill = {
  width: "100%",
  borderRadius: 14
};

const barLabel = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11
};
