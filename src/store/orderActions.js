import { calculateBill } from "../utils/calculateBill";
import { getTaxConfigSnapshot, normalizeTaxConfig } from "./settingsStore";

const ORDER_COUNTER_STORAGE_KEY = "cloud_kitchen_order_counter";
const ORDER_ID_PREFIX = "#427";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundToPaise = (value) => Number(toNumber(value).toFixed(2));

const clampNonNegative = (value, fallback = 0) => Math.max(0, toNumber(value, fallback));

const normalizePaymentMethod = (value = "cash") => {
  const normalized = String(value || "cash").trim().toLowerCase();
  return ["cash", "upi", "card"].includes(normalized) ? normalized : "cash";
};

const normalizeOrderType = (value = "delivery") => {
  const normalized = String(value || "delivery").trim().toLowerCase();
  return ["delivery", "takeaway"].includes(normalized) ? normalized : "delivery";
};

export const normalizeOrderStatus = (value = "new") => {
  const normalized = String(value || "new").trim().toLowerCase();

  if (["new", "preparing", "ready", "completed"].includes(normalized)) {
    return normalized;
  }

  if (["accepted"].includes(normalized)) {
    return "preparing";
  }

  if (["delivered", "dispatched", "done"].includes(normalized)) {
    return "completed";
  }

  return "new";
};

const createUuid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getNextOrderSequence = () => {
  if (typeof window === "undefined") {
    return Date.now() % 10000;
  }

  const currentCounter = toNumber(window.localStorage.getItem(ORDER_COUNTER_STORAGE_KEY), 0);
  const nextCounter = Math.max(1, currentCounter + 1);
  window.localStorage.setItem(ORDER_COUNTER_STORAGE_KEY, String(nextCounter));
  return nextCounter;
};

const getFallbackOrderId = (order = {}) => {
  const sourceId = String(order.id || order._id || Date.now());
  const numericPart = sourceId.replace(/\D/g, "").slice(-4);
  return `${ORDER_ID_PREFIX}-${String(numericPart || Date.now() % 10000).padStart(4, "0")}`;
};

export const generateOrderId = () => `${ORDER_ID_PREFIX}-${String(getNextOrderSequence()).padStart(4, "0")}`;

const normalizeCustomer = (customer = {}) => {
  const name = String(customer?.name || "").trim();
  const phone = String(customer?.phone || "").trim();

  return {
    name,
    phone
  };
};

const normalizeItemTaxRate = (value) => {
  const parsed = toNumber(value, Number.NaN);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(0, parsed);
};

const normalizeOrderItem = (item = {}) => {
  const qty = Math.max(1, toNumber(item.qty ?? item.quantity, 1));
  const price = clampNonNegative(item.price ?? item.unitPrice);
  const gst = normalizeItemTaxRate(item.gst ?? item.taxRate ?? item.tax);

  return {
    id: String(item.id || item.itemId || item.key || createUuid()),
    name: String(item.name || "Item").trim(),
    qty,
    price,
    gst,
    image: item.image || "",
    variant: item.variant || null,
    addOns: Array.isArray(item.addOns) ? item.addOns : []
  };
};

export const calculateOrderTotals = (cart = [], taxConfig = getTaxConfigSnapshot()) => {
  const items = Array.isArray(cart) ? cart.map(normalizeOrderItem) : [];
  const normalizedTaxConfig = normalizeTaxConfig(taxConfig);
  const totals = calculateBill(items, normalizedTaxConfig);

  return {
    items,
    subtotal: totals.subtotal,
    tax: totals.tax,
    gst: totals.tax,
    total: totals.total
  };
};

export const createOrder = (cart, customer, meta = {}) => {
  const appliedTaxConfig = normalizeTaxConfig(getTaxConfigSnapshot());
  const { items, subtotal, tax, total } = calculateOrderTotals(cart, appliedTaxConfig);

  return {
    id: createUuid(),
    orderId: generateOrderId(),
    items,
    customer: normalizeCustomer(customer),
    paymentMethod: normalizePaymentMethod(meta.payment),
    orderType: normalizeOrderType(meta.type),
    status: "new",
    subtotal: roundToPaise(subtotal),
    tax: roundToPaise(tax),
    gst: roundToPaise(tax),
    total: roundToPaise(total),
    taxMode: appliedTaxConfig.taxMode,
    taxName: appliedTaxConfig.taxName,
    taxRate: appliedTaxConfig.defaultTaxRate,
    createdAt: new Date().toISOString()
  };
};

export const normalizeIncomingOrder = (order = {}) => {
  const normalizedItems = Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [];
  const fallbackTaxConfig = normalizeTaxConfig({
    ...getTaxConfigSnapshot(),
    taxMode:
      order.taxMode ||
      (toNumber(order.tax ?? order.gst, 0) > 0 ? "exclusive" : getTaxConfigSnapshot().taxMode),
    defaultTaxRate: order.taxRate ?? order.defaultTaxRate ?? getTaxConfigSnapshot().defaultTaxRate,
    taxName: order.taxName || getTaxConfigSnapshot().taxName,
    roundOff: order.roundOff ?? getTaxConfigSnapshot().roundOff
  });
  const computedTotals = calculateOrderTotals(normalizedItems, fallbackTaxConfig);

  const subtotal = clampNonNegative(order.subtotal, computedTotals.subtotal);
  const tax = clampNonNegative(order.tax ?? order.gst ?? order.gstTotal, computedTotals.tax);
  const total = clampNonNegative(order.total ?? order.totalAmount ?? order.grandTotal, subtotal + tax);

  return {
    id: String(order.id || order._id || createUuid()),
    orderId: String(order.orderId || order.invoiceNumber || getFallbackOrderId(order)),
    items: computedTotals.items,
    customer: normalizeCustomer(order.customer),
    paymentMethod: normalizePaymentMethod(order.paymentMethod || order.paymentMode),
    orderType: normalizeOrderType(order.orderType || order.serviceType),
    status: normalizeOrderStatus(order.status),
    subtotal: roundToPaise(subtotal),
    tax: roundToPaise(tax),
    gst: roundToPaise(tax),
    total: roundToPaise(total),
    taxMode: fallbackTaxConfig.taxMode,
    taxName: fallbackTaxConfig.taxName,
    taxRate: fallbackTaxConfig.defaultTaxRate,
    createdAt: order.createdAt || new Date().toISOString()
  };
};
