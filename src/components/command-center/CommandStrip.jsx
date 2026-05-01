import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import AnimatedNumber from "../cloud/AnimatedNumber";
import { cloudKitchenTheme } from "../../theme";
import { STATUS_GLYPHS, STATUS_TONES, toStatusTone } from "./statusTheme";

const formatUpdatedTime = (timestamp) => {
  if (!timestamp) {
    return "just now";
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
};

const getTrendText = (trend) => {
  if (!trend) {
    return "";
  }
  if (typeof trend === "string") {
    return trend;
  }
  if (typeof trend?.label === "string" && trend.label.trim()) {
    return trend.label;
  }
  return "";
};

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Weekly" },
  { value: "30d", label: "Monthly" },
  { value: "custom", label: "Date range" }
];

const getTodayKey = () => new Date().toISOString().slice(0, 10);

export default function CommandStrip({
  metrics = [],
  lastUpdatedAt,
  refreshing = false,
  dateRange,
  onDateRangeChange
}) {
  const [customFrom, setCustomFrom] = useState(dateRange?.from || getTodayKey());
  const [customTo, setCustomTo] = useState(dateRange?.to || getTodayKey());
  const selectedRange = dateRange?.key || "today";

  useEffect(() => {
    if (dateRange?.from) {
      setCustomFrom(dateRange.from);
    }
    if (dateRange?.to) {
      setCustomTo(dateRange.to);
    }
  }, [dateRange?.from, dateRange?.to]);

  const handleRangeChange = (event) => {
    const nextRange = event.target.value;
    if (nextRange === "custom") {
      onDateRangeChange?.({
        key: "custom",
        from: customFrom || getTodayKey(),
        to: customTo || getTodayKey()
      });
      return;
    }

    onDateRangeChange?.({
      key: nextRange,
      from: "",
      to: ""
    });
  };

  const applyCustomRange = () => {
    onDateRangeChange?.({
      key: "custom",
      from: customFrom,
      to: customTo
    });
  };

  return (
    <section style={panel}>
      <div style={header}>
        <div>
          <div style={eyebrow}>Command Center</div>
          <div style={title}>Real-time Operations Strip</div>
        </div>

        <div style={headerControls}>
          {onDateRangeChange ? (
            <div style={rangeWrap}>
              <select value={selectedRange} onChange={handleRangeChange} style={rangeSelect}>
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {selectedRange === "custom" ? (
                <div style={dateRangeInputs}>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                    style={dateInput}
                  />
                  <input
                    type="date"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                    style={dateInput}
                  />
                  <button type="button" style={applyButton} onClick={applyCustomRange}>
                    Apply
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={statusWrap}>
            <div
              style={{
                ...livePill,
                ...(refreshing ? livePillRefreshing : null)
              }}
            >
              <span style={liveDot} />
              {refreshing ? "Refreshing" : "Live"}
            </div>
            <div style={updatedText}>Updated {formatUpdatedTime(lastUpdatedAt)}</div>
          </div>
        </div>
      </div>

      <div style={cardsGrid}>
        {metrics.map((metric) => {
          const toneKey = toStatusTone(metric.status);
          const tone = STATUS_TONES[toneKey] || STATUS_TONES.info;
          const trendTone = STATUS_TONES[toStatusTone(metric.trendStatus)] || tone;
          const trendText = getTrendText(metric.trend);
          const clickable = typeof metric.onClick === "function";

          return (
            <motion.button
              key={metric.key}
              type="button"
              onClick={clickable ? metric.onClick : undefined}
              whileHover={clickable ? { y: -2 } : undefined}
              whileTap={clickable ? { scale: 0.99 } : undefined}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{
                ...card,
                ...(clickable ? cardInteractive : cardStatic),
                borderColor: tone.border,
                background: tone.background
              }}
            >
              <div style={cardHeader}>
                <div
                  style={{
                    ...iconBadge,
                    background: cloudKitchenTheme.card,
                    color: tone.text,
                    borderColor: tone.border
                  }}
                >
                  {metric.icon || STATUS_GLYPHS[toneKey]}
                </div>
                <div style={label}>{metric.label}</div>
              </div>

              <div style={value}>
                <AnimatedNumber value={Number(metric.value || 0)} formatter={metric.formatter} />
              </div>

              <div style={contextText}>{metric.context || "Live visibility"}</div>
              {trendText ? (
                <div style={{ ...trendTextStyle, color: trendTone.text }}>{trendText}</div>
              ) : null}
            </motion.button>
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
  minWidth: 0,
  overflow: "hidden"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  flexWrap: "wrap"
};

const headerControls = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
  minWidth: 0
};

const rangeWrap = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
  minWidth: 0
};

const rangeSelect = {
  height: 32,
  borderRadius: 999,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: cloudKitchenTheme.panelSoft,
  color: cloudKitchenTheme.textPrimary,
  padding: "0 12px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  maxWidth: "100%"
};

const dateRangeInputs = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
  minWidth: 0
};

const dateInput = {
  height: 32,
  width: "min(128px, 100%)",
  minWidth: 0,
  borderRadius: 10,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  color: cloudKitchenTheme.textPrimary,
  padding: "0 8px",
  fontSize: 12,
  fontWeight: 700
};

const applyButton = {
  height: 32,
  borderRadius: 999,
  border: "1px solid rgba(17, 24, 39, 0.14)",
  background: cloudKitchenTheme.accent,
  color: "#FFFFFF",
  padding: "0 12px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer"
};

const statusWrap = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
  minWidth: 0
};

const eyebrow = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase"
};

const title = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 18,
  fontWeight: 800,
  marginTop: 4
};

const livePill = {
  height: 32,
  borderRadius: 999,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: cloudKitchenTheme.panelSoft,
  color: cloudKitchenTheme.textPrimary,
  fontSize: 12,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "0 12px"
};

const livePillRefreshing = {
  background: cloudKitchenTheme.warningSoft,
  borderColor: STATUS_TONES.warning.border,
  color: STATUS_TONES.warning.text
};

const liveDot = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: cloudKitchenTheme.success
};

const updatedText = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  fontWeight: 600
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 136px), 1fr))",
  gap: 8,
  marginTop: 14
};

const card = {
  borderRadius: 14,
  border: "1px solid",
  minHeight: 112,
  textAlign: "left",
  padding: "12px",
  display: "grid",
  alignContent: "start",
  gap: 7
};

const cardInteractive = {
  cursor: "pointer"
};

const cardStatic = {
  cursor: "default"
};

const cardHeader = {
  display: "flex",
  alignItems: "center",
  gap: 10
};

const iconBadge = {
  width: 22,
  height: 22,
  borderRadius: 999,
  border: "1px solid",
  display: "inline-grid",
  placeItems: "center",
  fontSize: 9,
  fontWeight: 800,
  flexShrink: 0
};

const label = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.02em"
};

const value = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 24,
  lineHeight: 1,
  fontWeight: 800
};

const contextText = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  lineHeight: 1.35
};

const trendTextStyle = {
  fontSize: 11,
  fontWeight: 700
};
