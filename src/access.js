import { UI_CONFIG } from "./config/uiConfig";
import { CRM_PAGE_KEYS } from "./modules/crm/routes";
import { hasPermission } from "./utils/permissionEngine";

export const ROLE_LABELS = {
  OWNER: "Owner",
  MANAGER: "Admin / Manager",
  CASHIER: "Cashier / POS Operator",
  KITCHEN: "Chef / Kitchen Staff",
  INVENTORY_MANAGER: "Inventory Manager",
  DELIVERY_MANAGER: "Delivery Manager",
  DELIVERY_PARTNER: "Delivery Partner",
  MARKETING_MANAGER: "Marketing Manager",
  ACCOUNTANT: "Accountant",
  WAITER: "Waiter / Service Staff",
  SUPER_ADMIN: "Platform Admin"
};

export const STAFF_ROLE_OPTIONS = [
  { value: "MANAGER", label: ROLE_LABELS.MANAGER },
  { value: "CASHIER", label: ROLE_LABELS.CASHIER },
  { value: "KITCHEN", label: ROLE_LABELS.KITCHEN },
  { value: "INVENTORY_MANAGER", label: ROLE_LABELS.INVENTORY_MANAGER },
  { value: "DELIVERY_MANAGER", label: ROLE_LABELS.DELIVERY_MANAGER },
  { value: "DELIVERY_PARTNER", label: ROLE_LABELS.DELIVERY_PARTNER },
  { value: "MARKETING_MANAGER", label: ROLE_LABELS.MARKETING_MANAGER },
  { value: "ACCOUNTANT", label: ROLE_LABELS.ACCOUNTANT },
  { value: "WAITER", label: ROLE_LABELS.WAITER }
];

export const PAGE_PERMISSIONS = {
  HOME: "dashboard.view",
  MENU_MANAGEMENT: "menu.manage",
  POS: "pos.view",
  KITCHEN: "kitchen.view",
  ORDERS: "orders.view",
  ORDER_MANAGEMENT: "orders.view",
  DELIVERY: "dispatch.view",
  TABLES: "tables.view",
  INVENTORY: "inventory.view",
  FINANCE_OVERVIEW: "finance.view",
  [CRM_PAGE_KEYS.CUSTOMERS_OVERVIEW]: "crm.view",
  [CRM_PAGE_KEYS.CUSTOMERS_LIST]: "crm.view",
  [CRM_PAGE_KEYS.CUSTOMER_PROFILE]: "crm.view",
  [CRM_PAGE_KEYS.MARKETING]: "marketing.view",
  DOCUMENTS: "documents.view",
  STAFF: "staff.view",
  ROLES: "roles.manage",
  ACTIVITY_LOGS: "audit.view",
  GENERAL_SETTINGS: "profile.view",
  NOTIFICATION_SETTINGS: "profile.view",
  INTEGRATIONS_SETTINGS: "profile.view",
  SUBSCRIPTION: "subscription.manage",
  PROFILE: "profile.view",
  SETTINGS: "profile.view",
  BILLING_TAX_SETTINGS: "settings.manage",
  ADMIN: "admin.view"
};

export const ROLE_ALLOWED_PAGES = Object.freeze(
  Object.keys(PAGE_PERMISSIONS).filter((pageKey) => pageKey !== CRM_PAGE_KEYS.CUSTOMER_PROFILE)
);

export const MENU_MANAGEMENT_ROLES = new Set(["OWNER", "MANAGER"]);

export const ORDER_STATUS_FLOW = ["NEW", "PREPARING", "READY", "DELIVERED"];

const BUSINESS_TYPES = {
  CLOUD_KITCHEN: "CLOUD_KITCHEN",
  RESTAURANT: "RESTAURANT"
};

const BUSINESS_TYPE_PAGE_EXCLUSIONS = {
  [BUSINESS_TYPES.CLOUD_KITCHEN]: new Set(["TABLES"]),
  [BUSINESS_TYPES.RESTAURANT]: new Set()
};

const ORDER_STATUS_LABELS = {
  ALL: "All statuses",
  PENDING: "Active",
  NEW: "New",
  PREPARING: "Preparing",
  READY: "Ready",
  DELIVERED: "Delivered",
  DISPATCHED: "Dispatched"
};

const LEGACY_ORDER_STATUS_ALIASES = {
  PENDING: "NEW",
  NEW_ORDER: "NEW",
  ACCEPTED: "PREPARING",
  OUT_FOR_DELIVERY: "READY",
  COMPLETED: "DELIVERED",
  DONE: "DELIVERED"
};

const ORDER_STATUS_TONES = {
  NEW: {
    color: "#84f7ff",
    borderColor: "rgba(132,247,255,0.45)",
    background: "rgba(132,247,255,0.14)"
  },
  PREPARING: {
    color: "#ffab7f",
    borderColor: "rgba(255,171,127,0.45)",
    background: "rgba(255,171,127,0.14)"
  },
  READY: {
    color: "#62dfcb",
    borderColor: "rgba(98,223,203,0.42)",
    background: "rgba(98,223,203,0.14)"
  },
  DELIVERED: {
    color: "#3ddf9b",
    borderColor: "rgba(61,223,155,0.45)",
    background: "rgba(61,223,155,0.14)"
  },
  DISPATCHED: {
    color: "#3ddf9b",
    borderColor: "rgba(61,223,155,0.45)",
    background: "rgba(61,223,155,0.14)"
  }
};

export const ORDER_STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: ORDER_STATUS_LABELS.ALL },
  { value: "PENDING", label: ORDER_STATUS_LABELS.PENDING },
  ...ORDER_STATUS_FLOW.map((value) => ({
    value,
    label: ORDER_STATUS_LABELS[value]
  }))
];

export const normalizeRole = (value = "") => String(value || "").trim().toUpperCase();

export const normalizeBusinessType = (value = "") => {
  const normalized = String(value || "").trim().toUpperCase();

  if (["CLOUD_KITCHEN", "CLOUD", "KITCHEN", "CLOUDKITCHEN"].includes(normalized)) {
    return BUSINESS_TYPES.CLOUD_KITCHEN;
  }

  if (["RESTAURANT", "DINE_IN", "DINING", "DINER"].includes(normalized)) {
    return BUSINESS_TYPES.RESTAURANT;
  }

  return "";
};

export const formatRoleLabel = (value = "") => {
  const normalized = normalizeRole(value);
  if (ROLE_LABELS[normalized]) {
    return ROLE_LABELS[normalized];
  }

  return normalized
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "Owner";
};

export const getAllowedPagesForRole = (userRole, businessType = "", rolePermissions) => {
  const normalizedBusinessType = normalizeBusinessType(businessType);
  const excludedPages = BUSINESS_TYPE_PAGE_EXCLUSIONS[normalizedBusinessType] || new Set();
  const user = { role: userRole || "OWNER" };

  return ROLE_ALLOWED_PAGES.filter(
    (pageKey) =>
      !excludedPages.has(pageKey) &&
      !(UI_CONFIG.DEV_MODE_UNLOCK_ALL && pageKey === "SUBSCRIPTION") &&
      hasPermission(user, PAGE_PERMISSIONS[pageKey], rolePermissions)
  );
};

export const getLandingPageForRole = (userRole, businessType = "", rolePermissions) => {
  const role = normalizeRole(userRole || "OWNER");
  const normalizedBusinessType = normalizeBusinessType(businessType);
  const allowedPages = getAllowedPagesForRole(role, normalizedBusinessType, rolePermissions);

  if (role === "SUPER_ADMIN") return "ADMIN";
  if (allowedPages.includes("HOME")) return "HOME";
  if (allowedPages.includes("DELIVERY")) return "DELIVERY";
  if (allowedPages.includes("KITCHEN")) return "KITCHEN";
  if (allowedPages.includes("TABLES") && normalizedBusinessType === "RESTAURANT") {
    return "TABLES";
  }
  if (allowedPages.includes("POS")) return "POS";
  if (allowedPages.includes("INVENTORY")) return "INVENTORY";
  if (allowedPages.includes(CRM_PAGE_KEYS.MARKETING)) return CRM_PAGE_KEYS.MARKETING;
  if (allowedPages.includes("FINANCE_OVERVIEW")) return "FINANCE_OVERVIEW";
  return allowedPages[0] || "HOME";
};

export const normalizeOrderStatus = (value, fallback = ORDER_STATUS_FLOW[0]) => {
  const normalized = String(value || "").trim().toUpperCase();

  if (!normalized) {
    return fallback;
  }

  if (LEGACY_ORDER_STATUS_ALIASES[normalized]) {
    return LEGACY_ORDER_STATUS_ALIASES[normalized];
  }

  if (ORDER_STATUS_FLOW.includes(normalized) || normalized === "DISPATCHED") {
    return normalized;
  }

  return fallback;
};

export const formatOrderStatus = (value) => {
  const normalized =
    value === "ALL" || value === "PENDING" ? value : normalizeOrderStatus(value, "");
  return ORDER_STATUS_LABELS[normalized] || ORDER_STATUS_LABELS.ALL;
};

export const isCompletedOrderStatus = (value) =>
  ["DELIVERED", "DISPATCHED"].includes(normalizeOrderStatus(value));
export const isActiveOrderStatus = (value) => !isCompletedOrderStatus(value);

export const getAvailableNextOrderStatuses = (value) => {
  const currentStatus = normalizeOrderStatus(value);
  const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);

  if (currentIndex === -1 || currentIndex === ORDER_STATUS_FLOW.length - 1) {
    return [];
  }

  return ORDER_STATUS_FLOW.slice(currentIndex + 1);
};

export const getOrderStatusTone = (value) => {
  return ORDER_STATUS_TONES[normalizeOrderStatus(value)] || ORDER_STATUS_TONES.NEW;
};
