export const roles = {
  owner: ["*"],
  manager: [
    "dashboard.view",
    "menu.manage",
    "pos.view",
    "pos.create",
    "orders.view",
    "orders.update",
    "kitchen.view",
    "inventory.view",
    "finance.view",
    "crm.view",
    "marketing.view",
    "documents.view",
    "profile.view"
  ],
  staff: ["profile.view", "pos.view", "pos.create", "kitchen.view", "orders.view"],
  delivery: ["profile.view", "dispatch.view"],
  kitchen: ["profile.view", "kitchen.view", "orders.view", "orders.update"],
  inventory_manager: [
    "profile.view",
    "orders.view",
    "inventory.view",
    "inventory.create",
    "inventory.update",
    "inventory.delete"
  ],
  accountant: [
    "profile.view",
    "dashboard.view",
    "orders.view",
    "inventory.view",
    "finance.view",
    "expenses.view",
    "expenses.create",
    "expenses.delete",
    "crm.view",
    "documents.view"
  ],
  marketing_manager: [
    "profile.view",
    "finance.view",
    "crm.view",
    "marketing.view",
    "marketing.create",
    "marketing.update",
    "documents.view"
  ],
  super_admin: ["*"]
};

export const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
  { value: "delivery", label: "Delivery" }
];

export const MODULE_PERMISSION_MATRIX = [
  {
    module: "POS",
    actions: {
      view: "pos.view",
      create: "pos.create",
      edit: "pos.update",
      delete: "pos.delete"
    }
  },
  {
    module: "Orders",
    actions: {
      view: "orders.view",
      create: "pos.create",
      edit: "orders.update",
      delete: "orders.delete"
    }
  },
  {
    module: "Kitchen",
    actions: {
      view: "kitchen.view",
      create: "",
      edit: "orders.update",
      delete: ""
    }
  },
  {
    module: "Inventory",
    actions: {
      view: "inventory.view",
      create: "inventory.create",
      edit: "inventory.update",
      delete: "inventory.delete"
    }
  },
  {
    module: "Finance",
    actions: {
      view: "finance.view",
      create: "expenses.create",
      edit: "finance.manage",
      delete: "expenses.delete"
    }
  },
  {
    module: "CRM",
    actions: {
      view: "crm.view",
      create: "crm.create",
      edit: "crm.update",
      delete: "crm.delete"
    }
  },
  {
    module: "Settings",
    actions: {
      view: "settings.view",
      create: "staff.create",
      edit: "settings.manage",
      delete: "staff.deactivate"
    }
  }
];

const ROLE_ALIASES = {
  OWNER: "owner",
  ADMIN: "owner",
  MANAGER: "manager",
  ADMIN_MANAGER: "manager",
  STAFF: "staff",
  CASHIER: "staff",
  POS_OPERATOR: "staff",
  WAITER: "staff",
  KITCHEN: "kitchen",
  CHEF: "kitchen",
  KITCHEN_STAFF: "kitchen",
  DELIVERY: "delivery",
  DELIVERY_MANAGER: "delivery",
  DELIVERY_PARTNER: "delivery",
  INVENTORY_MANAGER: "inventory_manager",
  ACCOUNTANT: "accountant",
  MARKETING_MANAGER: "marketing_manager",
  SUPER_ADMIN: "super_admin"
};

export const normalizePermissionRole = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[/\s-]+/g, "_")
    .replace(/_+/g, "_");

  return ROLE_ALIASES[normalized] || normalized.toLowerCase();
};

const getUserPermissions = (user, rolePermissions) => {
  const roleKey = normalizePermissionRole(user?.role);
  const permissionSource = rolePermissions || user?.rolePermissions || roles;
  const configuredPermissions = permissionSource?.[roleKey] || roles[roleKey] || [];
  const directPermissions = Array.isArray(user?.permissions) ? user.permissions : [];

  return Array.from(new Set([...configuredPermissions, ...directPermissions]));
};

export function hasPermission(user, permission, rolePermissions) {
  if (!permission) {
    return true;
  }

  if (!user || !user.role) {
    return false;
  }

  const roleKey = normalizePermissionRole(user.role);
  if (String(permission).startsWith("admin.") && roleKey !== "super_admin") {
    return false;
  }

  const rolePermissionsForUser = getUserPermissions(user, rolePermissions);

  if (rolePermissionsForUser.includes("*")) {
    return true;
  }

  if (rolePermissionsForUser.includes(permission)) {
    return true;
  }

  const [moduleName] = String(permission).split(".");
  return rolePermissionsForUser.includes(`${moduleName}.*`);
}

export function hasAnyPermission(user, permissions = [], rolePermissions) {
  return permissions.some((permission) => hasPermission(user, permission, rolePermissions));
}

export function getRolePermissions(role, rolePermissions) {
  const roleKey = normalizePermissionRole(role);
  return [...(rolePermissions?.[roleKey] || roles[roleKey] || [])];
}

export function toggleRolePermission(rolePermissions, role, permission, enabled) {
  const roleKey = normalizePermissionRole(role);
  const currentPermissions = new Set(getRolePermissions(roleKey, rolePermissions));

  if (enabled) {
    currentPermissions.add(permission);
  } else {
    currentPermissions.delete(permission);
  }

  return {
    ...rolePermissions,
    [roleKey]: Array.from(currentPermissions).sort()
  };
}
