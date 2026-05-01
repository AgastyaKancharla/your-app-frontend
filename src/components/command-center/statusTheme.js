import { cloudKitchenTheme, theme } from "../../theme";

const infoBlue = theme?.colors?.blue || "#3B82F6";

export const STATUS_TONES = {
  critical: {
    text: "#991b1b",
    background: cloudKitchenTheme.dangerSoft,
    border: "rgba(239,68,68,0.24)"
  },
  warning: {
    text: "#92400e",
    background: cloudKitchenTheme.warningSoft,
    border: "rgba(245,158,11,0.28)"
  },
  success: {
    text: "#166534",
    background: cloudKitchenTheme.successSoft,
    border: "rgba(34,197,94,0.25)"
  },
  info: {
    text: infoBlue,
    background: "rgba(109,127,245,0.12)",
    border: "rgba(109,127,245,0.26)"
  }
};

export const STATUS_GLYPHS = {
  critical: "!",
  warning: "!",
  success: "OK",
  info: "i"
};

export const toStatusTone = (value = "info") => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "critical" || normalized === "danger" || normalized === "error") {
    return "critical";
  }
  if (normalized === "warning" || normalized === "warn") {
    return "warning";
  }
  if (normalized === "success" || normalized === "ok") {
    return "success";
  }
  return "info";
};
