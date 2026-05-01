import { motion } from "framer-motion";

import AnimatedNumber from "../cloud/AnimatedNumber";
import { cloudKitchenTheme } from "../../theme";
import { STATUS_TONES, toStatusTone } from "./statusTheme";

const getPrepStatus = (value) => {
  const numeric = Number(value || 0);
  if (numeric >= 24) {
    return "critical";
  }
  if (numeric >= 14) {
    return "warning";
  }
  return "success";
};

const getLoadStatus = (value) => {
  const numeric = Number(value || 0);
  if (numeric >= 80) {
    return "critical";
  }
  if (numeric >= 60) {
    return "warning";
  }
  return "success";
};

const getOnTimeStatus = (value) => {
  const numeric = Number(value || 0);
  if (numeric < 70) {
    return "critical";
  }
  if (numeric < 85) {
    return "warning";
  }
  return "success";
};

export default function PerformancePanel({ summary, rangeLabel = "Today" }) {
  const activeOrders = Number(summary?.activeOrders || 0);
  const delayedOrders = Number(summary?.delayedOrders || 0);
  const onTimeRate = activeOrders
    ? Math.max(0, ((activeOrders - delayedOrders) / activeOrders) * 100)
    : 100;

  const cards = [
    {
      key: "avgPrep",
      label: "Avg Prep Time",
      value: Number(summary?.avgPrepTimeMinutes || 0),
      formatter: (value) => `${Number(value || 0).toFixed(1)} min`,
      status: getPrepStatus(summary?.avgPrepTimeMinutes),
      context: `${rangeLabel} rolling queue`
    },
    {
      key: "onTimeRate",
      label: "On-Time Rate",
      value: onTimeRate,
      formatter: (value) => `${Math.round(Number(value || 0))}%`,
      status: getOnTimeStatus(onTimeRate),
      context: `SLA threshold ${summary?.delayThresholdMinutes || 15} min`
    },
    {
      key: "kitchenLoad",
      label: "Kitchen Load",
      value: Number(summary?.kitchenLoad || 0),
      formatter: (value) => `${Math.round(Number(value || 0))}%`,
      status: getLoadStatus(summary?.kitchenLoad),
      context: summary?.kitchenLoadLabel || "Stable"
    },
    {
      key: "rejected",
      label: "Rejected Orders",
      value: Number(summary?.rejectedOrders || 0),
      formatter: (value) => Math.round(Number(value || 0)).toLocaleString("en-IN"),
      status: Number(summary?.rejectedOrders || 0) > 0 ? "critical" : "success",
      context: rangeLabel
    }
  ];

  return (
    <section style={panel}>
      <div style={header}>
        <div style={title}>Performance Panel</div>
        <div style={subtitle}>Data-backed operational health metrics</div>
      </div>

      <div style={grid}>
        {cards.map((card) => {
          const tone = STATUS_TONES[toStatusTone(card.status)] || STATUS_TONES.info;

          return (
            <motion.article
              key={card.key}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              style={{
                ...cardStyle,
                borderColor: tone.border,
                background: tone.background
              }}
            >
              <div style={label}>{card.label}</div>
              <div style={value}>
                <AnimatedNumber value={card.value} formatter={card.formatter} />
              </div>
              <div style={context}>{card.context}</div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

const panel = {
  background: cloudKitchenTheme.card,
  border: `1px solid ${cloudKitchenTheme.border}`,
  borderRadius: 18,
  padding: 12,
  boxShadow: cloudKitchenTheme.shadow,
  minWidth: 0
};

const header = {
  marginBottom: 12
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

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
  gap: 8
};

const cardStyle = {
  border: "1px solid",
  borderRadius: 14,
  padding: 12,
  display: "grid",
  gap: 8
};

const label = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  fontWeight: 700
};

const value = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 24,
  fontWeight: 800
};

const context = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  lineHeight: 1.35
};
