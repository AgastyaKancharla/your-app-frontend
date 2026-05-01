export const financeColors = {
  revenue: "#22c55e",
  expenses: "#ef4444",
  profit: "#3b82f6",
  profitMargin: "#f59e0b",
  avgProfit: "#8b5cf6",
  border: "#eadcf9",
  ink: "#171226",
  muted: "#6f678a",
  panel: "#ffffff",
  softPanel: "#faf7ff"
};

export const channelPalette = {
  DIRECT: "#7c3aed",
  SWIGGY: "#22c55e",
  ZOMATO: "#f97316"
};

export const expensePalette = {
  "Raw Materials": "#7c3aed",
  Packaging: "#22c55e",
  Staff: "#3b82f6",
  Rent: "#f97316",
  Utilities: "#f59e0b",
  Others: "#a855f7"
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1
});

const numberFormatter = new Intl.NumberFormat("en-IN");

export const formatCurrency = (value = 0) => currencyFormatter.format(Number(value || 0));
export const formatPercent = (value = 0) => `${percentFormatter.format(Number(value || 0))}%`;
export const formatNumber = (value = 0) => numberFormatter.format(Number(value || 0));

export const formatTrend = (trend = {}) => {
  const direction = String(trend.direction || "flat");
  const percent = Number(trend.percent || 0);
  const sign = direction === "up" ? "+" : direction === "down" ? "-" : "";
  const absPercent = Math.abs(percent);

  return {
    label: `${sign}${absPercent.toFixed(1)}%`,
    tone:
      direction === "up"
        ? "text-emerald-600"
        : direction === "down"
          ? "text-rose-600"
          : "text-slate-500"
  };
};

export const tooltipValueFormatter = (value, name) => {
  if (name === "Margin" || name === "margin") {
    return formatPercent(value);
  }
  return formatCurrency(value);
};
