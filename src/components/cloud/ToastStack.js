import { AnimatePresence, motion } from "framer-motion";

import { cloudKitchenTheme } from "../../theme";

const TONE_STYLES = {
  success: {
    background: cloudKitchenTheme.successSoft,
    borderColor: "rgba(34,197,94,0.18)",
    color: "#166534"
  },
  warning: {
    background: cloudKitchenTheme.warningSoft,
    borderColor: "rgba(245,158,11,0.18)",
    color: "#92400e"
  },
  danger: {
    background: cloudKitchenTheme.dangerSoft,
    borderColor: "rgba(239,68,68,0.18)",
    color: "#991b1b"
  }
};

export default function ToastStack({ toasts = [] }) {
  return (
    <div style={viewport}>
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = TONE_STYLES[toast.tone] || TONE_STYLES.success;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{
                ...toastCard,
                ...tone
              }}
            >
              <span style={toastIcon}>✓</span>
              <span>{toast.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

const viewport = {
  position: "fixed",
  top: 88,
  right: 20,
  display: "grid",
  gap: 10,
  zIndex: 30,
  pointerEvents: "none"
};

const toastCard = {
  minWidth: 220,
  maxWidth: 320,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid",
  boxShadow: cloudKitchenTheme.shadow,
  fontSize: 13,
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  gap: 10
};

const toastIcon = {
  display: "inline-grid",
  placeItems: "center",
  width: 20,
  height: 20,
  borderRadius: 999,
  background: "#FFFFFF",
  flexShrink: 0
};
