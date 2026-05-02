import { io } from "socket.io-client";

import API_URL from "../../config/api";

export const CLOUD_KITCHEN_STATUS_FLOW = ["NEW", "PREPARING", "READY", "DISPATCHED"];

export const CLOUD_KITCHEN_STATUS_LABELS = {
  NEW: "New",
  PREPARING: "Preparing",
  READY: "Ready",
  DISPATCHED: "Dispatched",
  CANCELLED: "Cancelled"
};

export const STATUS_ACTIONS = {
  NEW: { label: "Start", nextStatus: "PREPARING" },
  PREPARING: { label: "Mark Ready", nextStatus: "READY" },
  READY: { label: "Dispatch", nextStatus: "DISPATCHED" }
};

export const MENU_AVAILABILITY_LABELS = {
  IN_STOCK: "In Stock",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock"
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export const DEFAULT_MENU_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80";

export const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

export const normalizeCloudOrderStatus = (value = "", fallback = "NEW") => {
  const normalized = String(value || "").trim().toUpperCase();

  if (!normalized) {
    return fallback;
  }

  if (normalized === "DELIVERED" || normalized === "COMPLETED" || normalized === "DONE") {
    return "DISPATCHED";
  }

  if (normalized === "ACCEPTED") {
    return "PREPARING";
  }

  if (normalized === "OUT_FOR_DELIVERY") {
    return "READY";
  }

  if (CLOUD_KITCHEN_STATUS_FLOW.includes(normalized) || normalized === "CANCELLED") {
    return normalized;
  }

  return fallback;
};

export const getStatusLabel = (value) =>
  CLOUD_KITCHEN_STATUS_LABELS[normalizeCloudOrderStatus(value)] || "New";

export const getPlatformLabel = (order = {}) => {
  const source = String(
    order.platform ||
      order.orderChannel ||
      order.integrationMeta?.sourceLabel ||
      order.integrationMeta?.source ||
      "MANUAL"
  )
    .trim()
    .toUpperCase();

  if (source === "DIRECT" || source === "WALK_IN") {
    return "MANUAL";
  }

  return source || "MANUAL";
};

export const isActiveKitchenOrder = (order = {}) => {
  const status = normalizeCloudOrderStatus(order.status, "NEW");
  return status !== "DISPATCHED" && status !== "CANCELLED";
};

export const getOrderAgeMinutes = (order, now = Date.now()) => {
  const createdAt = new Date(order?.createdAt || now).getTime();
  if (!Number.isFinite(createdAt)) {
    return 0;
  }

  return Math.max(0, (now - createdAt) / 60000);
};

export const formatTimer = (value) => {
  const totalSeconds = Math.max(0, Math.floor(Number(value || 0) * 60));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const getPrepProgress = (order, now = Date.now()) => {
  const elapsed = getOrderAgeMinutes(order, now);
  const expected = Math.max(1, Number(order?.expectedPrepTimeMinutes || 18));
  return {
    elapsed,
    expected,
    percentage: Math.min(100, Math.round((elapsed / expected) * 100)),
    delayed: elapsed > expected
  };
};

export const deriveCategories = (menuItems = []) => {
  const categories = Array.from(
    new Set(
      menuItems
        .map((item) => String(item?.category || "").trim())
        .filter(Boolean)
    )
  );

  return ["ALL", ...categories];
};

const resolveSocketOrigin = () => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return API_URL;
  }
};

export const connectOrdersSocket = (tenantId) => {
  const socketOrigin = resolveSocketOrigin();
  if (!socketOrigin || !tenantId) {
    return null;
  }

  return io(`${socketOrigin}/orders`, {
    transports: ["websocket"],
    auth: {
      tenantId
    }
  });
};
