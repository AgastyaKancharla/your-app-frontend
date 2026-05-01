import { motion } from "framer-motion";

import { cloudKitchenTheme } from "../../theme";
import { STATUS_GLYPHS, STATUS_TONES, toStatusTone } from "./statusTheme";

export default function QuickActions({ actions = [], onAction }) {
  return (
    <section style={panel}>
      <div style={header}>
        <div style={title}>Quick Actions</div>
        <div style={subtitle}>Direct controls for kitchen and order flow</div>
      </div>

      <div style={actionsGrid}>
        {actions.map((action) => {
          const status = toStatusTone(action.status);
          const tone = STATUS_TONES[status] || STATUS_TONES.info;
          const disabled = Boolean(action.disabled);

          return (
            <motion.button
              key={action.key}
              type="button"
              onClick={() => onAction?.(action.key)}
              disabled={disabled}
              whileHover={disabled ? undefined : { y: -2 }}
              whileTap={disabled ? undefined : { scale: 0.985 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{
                ...actionButton,
                ...(disabled ? actionButtonDisabled : null),
                borderColor: tone.border,
                background: tone.background
              }}
            >
              <div style={actionTopRow}>
                <div style={actionLabelWrap}>
                  <span
                    style={{
                      ...actionIcon,
                      color: tone.text,
                      borderColor: tone.border
                    }}
                  >
                    {action.icon || STATUS_GLYPHS[status]}
                  </span>
                  <span style={actionLabel}>{action.label}</span>
                </div>

                <div style={metaCluster}>
                  {action.badge ? <span style={badge}>{action.badge}</span> : null}
                  {action.isToggle ? (
                    <span
                      style={{
                        ...togglePill,
                        ...(action.toggled ? togglePillOn : togglePillOff)
                      }}
                    >
                      {action.toggled ? action.toggleOnLabel || "ON" : action.toggleOffLabel || "OFF"}
                    </span>
                  ) : null}
                </div>
              </div>

              <div style={actionDescription}>{action.description}</div>
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

const actionsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
  gap: 8
};

const actionButton = {
  minHeight: 76,
  borderRadius: 13,
  border: "1px solid",
  textAlign: "left",
  padding: 10,
  display: "grid",
  alignContent: "start",
  gap: 8,
  cursor: "pointer"
};

const actionButtonDisabled = {
  opacity: 0.56,
  cursor: "not-allowed"
};

const actionTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10
};

const actionLabelWrap = {
  display: "flex",
  alignItems: "center",
  gap: 8
};

const actionIcon = {
  width: 22,
  height: 22,
  borderRadius: 999,
  border: "1px solid",
  display: "inline-grid",
  placeItems: "center",
  fontSize: 10,
  fontWeight: 800,
  background: "#FFFFFF"
};

const actionLabel = {
  color: cloudKitchenTheme.textPrimary,
  fontSize: 12,
  fontWeight: 800
};

const metaCluster = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6
};

const badge = {
  minWidth: 22,
  height: 22,
  padding: "0 7px",
  borderRadius: 999,
  display: "inline-grid",
  placeItems: "center",
  border: `1px solid ${cloudKitchenTheme.border}`,
  background: "#FFFFFF",
  color: cloudKitchenTheme.textSecondary,
  fontSize: 11,
  fontWeight: 700
};

const togglePill = {
  height: 22,
  borderRadius: 999,
  padding: "0 8px",
  display: "inline-grid",
  placeItems: "center",
  fontSize: 10,
  fontWeight: 800,
  border: "1px solid"
};

const togglePillOn = {
  color: STATUS_TONES.success.text,
  background: STATUS_TONES.success.background,
  borderColor: STATUS_TONES.success.border
};

const togglePillOff = {
  color: cloudKitchenTheme.textSecondary,
  background: "#FFFFFF",
  borderColor: cloudKitchenTheme.border
};

const actionDescription = {
  color: cloudKitchenTheme.textSecondary,
  fontSize: 12,
  lineHeight: 1.4
};
