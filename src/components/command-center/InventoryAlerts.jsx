import { motion } from "framer-motion";

import { cloudKitchenTheme } from "../../theme";
import { STATUS_GLYPHS, STATUS_TONES, toStatusTone } from "./statusTheme";

const formatRunway = (daysToEmpty) => {
  const numeric = Number(daysToEmpty);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "running low";
  }

  const hours = numeric * 24;
  if (hours < 1) {
    return "< 1 hour left";
  }
  if (hours < 24) {
    return `${Math.ceil(hours)} hr left`;
  }
  return `${Math.ceil(numeric)} day left`;
};

const getSeverity = (item = {}) => {
  const daysToEmpty = Number(item.daysToEmpty);
  const quantity = Number(item.quantity || 0);

  if (quantity <= 0 || (Number.isFinite(daysToEmpty) && daysToEmpty <= 1)) {
    return "critical";
  }
  if (Number.isFinite(daysToEmpty) && daysToEmpty <= 2) {
    return "warning";
  }
  return "info";
};

const getUrgencyLabel = (severity) => {
  if (severity === "critical") {
    return "Restock immediately";
  }
  if (severity === "warning") {
    return "Restock soon";
  }
  return "Watch";
};

export default function InventoryAlerts({ items = [] }) {
  const visibleItems = Array.isArray(items) ? items.slice(0, 6) : [];

  return (
    <section style={panel}>
      <div style={header}>
        <div style={title}>Inventory Alerts</div>
        <div style={subtitle}>Low-stock items with urgency indicators</div>
      </div>

      {!visibleItems.length ? (
        <div style={emptyState}>No low-stock alerts right now.</div>
      ) : (
        <div style={list}>
          {visibleItems.map((item) => {
            const severity = toStatusTone(getSeverity(item));
            const tone = STATUS_TONES[severity] || STATUS_TONES.info;

            return (
              <motion.article
                key={item._id || item.name}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                style={{
                  ...itemCard,
                  borderColor: tone.border,
                  background: tone.background
                }}
                className={severity === "critical" ? "cloud-kitchen-soft-pulse" : ""}
              >
                <div style={itemTop}>
                  <div>
                    <div style={itemName}>{item.name}</div>
                    <div style={itemMeta}>
                      {Number(item.quantity || 0).toLocaleString("en-IN")} {item.unit || "units"} left
                    </div>
                  </div>

                  <div
                    style={{
                      ...severityBadge,
                      color: tone.text,
                      borderColor: tone.border
                    }}
                  >
                    {STATUS_GLYPHS[severity]} {getUrgencyLabel(severity)}
                  </div>
                </div>

                <div style={{ ...runwayText, color: tone.text }}>{formatRunway(item.daysToEmpty)}</div>
              </motion.article>
            );
          })}
        </div>
      )}
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

const list = {
  display: "grid",
  gap: 8
};

const itemCard = {
  borderRadius: 12,
  border: "1px solid",
  padding: 12,
  display: "grid",
  gap: 8
};

const itemTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  flexWrap: "wrap"
};

const itemName = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 13,
  fontWeight: 800
};

const itemMeta = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  marginTop: 4
};

const severityBadge = {
  borderRadius: 999,
  border: "1px solid",
  background: "#FFFFFF",
  padding: "5px 9px",
  fontSize: 10,
  fontWeight: 800
};

const runwayText = {
  fontSize: 12,
  fontWeight: 700
};

const emptyState = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 13
};
