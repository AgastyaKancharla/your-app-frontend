import { motion } from "framer-motion";

import { cloudKitchenTheme } from "../../theme";
import { STATUS_TONES } from "./statusTheme";

const buildLinePath = (series, valueKey, width, height, padding) => {
  const max = Math.max(...series.map((item) => Number(item?.[valueKey] || 0)), 1);
  const stepX = series.length > 1 ? (width - padding * 2) / (series.length - 1) : 0;

  return series
    .map((item, index) => {
      const value = Number(item?.[valueKey] || 0);
      const x = padding + stepX * index;
      const y = height - padding - (value / max) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
};

const formatTrend = (series = []) => {
  if (series.length < 2) {
    return { label: "Trend unavailable", status: "info" };
  }

  const latest = Number(series[series.length - 1]?.orders || 0);
  const previous = Number(series[series.length - 2]?.orders || 0);
  const delta = latest - previous;

  if (delta > 0) {
    return { label: `+${delta} vs previous slot`, status: "success" };
  }
  if (delta < 0) {
    return { label: `${delta} vs previous slot`, status: "warning" };
  }
  return { label: "Flat vs previous slot", status: "info" };
};

export default function ThroughputChart({ series = [] }) {
  const safeSeries =
    Array.isArray(series) && series.length ? series : [{ label: "No data", orders: 0 }];
  const width = 520;
  const height = 180;
  const padding = 18;
  const linePath = buildLinePath(safeSeries, "orders", width, height, padding);
  const peakOrders = Math.max(...safeSeries.map((item) => Number(item?.orders || 0)), 0);
  const trend = formatTrend(safeSeries);
  const trendTone = STATUS_TONES[trend.status] || STATUS_TONES.info;

  return (
    <section style={panel}>
      <div style={header}>
        <div>
          <div style={title}>Throughput</div>
          <div style={subtitle}>Order flow over selected period</div>
        </div>
        <div style={statWrap}>
          <div style={peakStat}>{peakOrders} peak</div>
          <div style={{ ...trendText, color: trendTone.text }}>{trend.label}</div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={chart}>
        <path
          d={`${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
          fill="rgba(17,17,17,0.06)"
        />
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          d={linePath}
          fill="none"
          stroke={cloudKitchenTheme.accent}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div style={labels}>
        {safeSeries.map((item) => (
          <span key={item.date || item.label} style={label}>
            {item.label}
          </span>
        ))}
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
  gap: 12,
  alignItems: "flex-start",
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

const statWrap = {
  textAlign: "right"
};

const peakStat = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 13,
  fontWeight: 800
};

const trendText = {
  fontSize: 11,
  fontWeight: 700,
  marginTop: 4
};

const chart = {
  width: "100%",
  height: 180,
  display: "block"
};

const labels = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 48px), 1fr))",
  gap: 6,
  marginTop: 8
};

const label = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11
};
