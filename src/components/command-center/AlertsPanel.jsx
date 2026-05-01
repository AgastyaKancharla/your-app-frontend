import { motion } from "framer-motion";

import { cloudKitchenTheme } from "../../theme";
import { STATUS_GLYPHS, STATUS_TONES, toStatusTone } from "./statusTheme";

export default function AlertsPanel({ alerts = [] }) {
  const visibleAlerts = Array.isArray(alerts) ? alerts.slice(0, 6) : [];

  return (
    <section style={panel}>
      <div style={header}>
        <div style={title}>Alerts</div>
        <div style={subtitle}>Critical and warning signals from live operations</div>
      </div>

      {!visibleAlerts.length ? (
        <div
          style={{
            ...emptyState,
            borderColor: STATUS_TONES.success.border,
            background: STATUS_TONES.success.background,
            color: STATUS_TONES.success.text
          }}
        >
          <span style={iconBadge}>{STATUS_GLYPHS.success}</span>
          <span>All operations are stable right now.</span>
        </div>
      ) : (
        <div style={alertsGrid}>
          {visibleAlerts.map((alert) => {
            const status = toStatusTone(alert.severity || alert.tone || "info");
            const tone = STATUS_TONES[status] || STATUS_TONES.info;

            return (
              <motion.article
                key={alert.id || alert.message}
                layout
                whileHover={{ y: -1 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={{
                  ...alertCard,
                  borderColor: tone.border,
                  background: tone.background
                }}
              >
                <div style={alertTop}>
                  <span
                    style={{
                      ...iconBadge,
                      color: tone.text,
                      borderColor: tone.border
                    }}
                  >
                    {STATUS_GLYPHS[status]}
                  </span>
                  <div style={alertMessage}>{alert.message}</div>
                </div>

                {alert.context ? <div style={alertContext}>{alert.context}</div> : null}

                {alert.ctaLabel && typeof alert.onCta === "function" ? (
                  <button type="button" onClick={alert.onCta} style={{ ...ctaButton, color: tone.text }}>
                    {alert.ctaLabel}
                  </button>
                ) : null}
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
  minHeight: "100%",
  minWidth: 0
};

const header = {
  marginBottom: 14
};

const title = {
  color: cloudKitchenTheme.textPrimary,
  fontWeight: 800,
  fontSize: 16
};

const subtitle = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  marginTop: 4
};

const alertsGrid = {
  display: "grid",
  gap: 10
};

const alertCard = {
  borderRadius: 14,
  border: "1px solid",
  padding: 12,
  display: "grid",
  gap: 8
};

const alertTop = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8
};

const iconBadge = {
  width: 22,
  height: 22,
  borderRadius: 999,
  border: "1px solid",
  display: "inline-grid",
  placeItems: "center",
  fontSize: 10,
  fontWeight: 800,
  background: "#FFFFFF",
  flexShrink: 0
};

const alertMessage = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.45
};

const alertContext = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  lineHeight: 1.4
};

const ctaButton = {
  justifySelf: "start",
  height: 30,
  borderRadius: 10,
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  fontSize: 12,
  fontWeight: 700,
  padding: "0 10px",
  cursor: "pointer"
};

const emptyState = {
  border: "1px solid",
  borderRadius: 14,
  padding: "12px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 13,
  fontWeight: 700
};
