import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const SETTINGS_STORAGE_KEY = "cloud_kitchen_billing_tax_settings_v1";
const WORKSPACE_SETTINGS_STORAGE_KEY = "cloud_kitchen_workspace_settings_v1";
const NOTIFICATION_SETTINGS_STORAGE_KEY = "cloud_kitchen_notification_settings_v1";
const VALID_TAX_MODES = new Set(["disabled", "exclusive", "inclusive"]);

export const DEFAULT_TAX_CONFIG = Object.freeze({
  taxMode: "disabled",
  defaultTaxRate: 5,
  taxName: "GST",
  itemLevelTax: true,
  showTaxBreakdown: true,
  roundOff: false
});

export const DEFAULT_WORKSPACE_SETTINGS = Object.freeze({
  name: "",
  phone: "",
  email: "",
  address: "",
  timezone: "Asia/Kolkata",
  currency: "INR",
  openingTime: "09:00",
  closingTime: "23:00"
});

export const DEFAULT_NOTIFICATION_SETTINGS = Object.freeze({
  offers: true,
  rewards: true,
  updates: true
});

let taxConfigSnapshot = { ...DEFAULT_TAX_CONFIG };

const SettingsStoreContext = createContext(null);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeTaxMode = (value = DEFAULT_TAX_CONFIG.taxMode) => {
  const normalized = String(value || DEFAULT_TAX_CONFIG.taxMode)
    .trim()
    .toLowerCase();

  return VALID_TAX_MODES.has(normalized) ? normalized : DEFAULT_TAX_CONFIG.taxMode;
};

export const normalizeTaxConfig = (value = {}) => {
  const source = value || {};
  const defaultTaxRate = Math.max(0, toNumber(source.defaultTaxRate, DEFAULT_TAX_CONFIG.defaultTaxRate));
  const taxName = String(source.taxName || DEFAULT_TAX_CONFIG.taxName).trim() || DEFAULT_TAX_CONFIG.taxName;

  return {
    taxMode: normalizeTaxMode(source.taxMode),
    defaultTaxRate: Number(defaultTaxRate.toFixed(2)),
    taxName,
    itemLevelTax: source.itemLevelTax !== false,
    showTaxBreakdown: source.showTaxBreakdown !== false,
    roundOff: Boolean(source.roundOff)
  };
};

const normalizeWorkspace = (value = {}) => {
  const source = value || {};

  return {
    name: String(source.name || DEFAULT_WORKSPACE_SETTINGS.name),
    phone: String(source.phone || DEFAULT_WORKSPACE_SETTINGS.phone),
    email: String(source.email || DEFAULT_WORKSPACE_SETTINGS.email),
    address: String(source.address || DEFAULT_WORKSPACE_SETTINGS.address),
    timezone: String(source.timezone || DEFAULT_WORKSPACE_SETTINGS.timezone),
    currency: String(source.currency || DEFAULT_WORKSPACE_SETTINGS.currency),
    openingTime: String(source.openingTime || DEFAULT_WORKSPACE_SETTINGS.openingTime),
    closingTime: String(source.closingTime || DEFAULT_WORKSPACE_SETTINGS.closingTime)
  };
};

const normalizeNotifications = (value = {}) => {
  const source = value || {};

  return {
    offers: source.offers !== false,
    rewards: source.rewards !== false,
    updates: source.updates !== false
  };
};

const readStoredTaxConfig = () => {
  if (typeof window === "undefined") {
    return { ...DEFAULT_TAX_CONFIG };
  }

  try {
    const rawValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return { ...DEFAULT_TAX_CONFIG };
    }

    const parsedValue = JSON.parse(rawValue);
    return normalizeTaxConfig(parsedValue);
  } catch {
    return { ...DEFAULT_TAX_CONFIG };
  }
};

const readStoredSettings = (storageKey, defaults, normalizer) => {
  if (typeof window === "undefined") {
    return { ...defaults };
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return { ...defaults };
    }

    return normalizer(JSON.parse(rawValue));
  } catch {
    return { ...defaults };
  }
};

export function SettingsStoreProvider({ children }) {
  const [taxConfig, setTaxConfig] = useState(() => {
    const initialConfig = readStoredTaxConfig();
    taxConfigSnapshot = initialConfig;
    return initialConfig;
  });
  const [workspace, setWorkspace] = useState(() =>
    readStoredSettings(
      WORKSPACE_SETTINGS_STORAGE_KEY,
      DEFAULT_WORKSPACE_SETTINGS,
      normalizeWorkspace
    )
  );
  const [notifications, setNotifications] = useState(() =>
    readStoredSettings(
      NOTIFICATION_SETTINGS_STORAGE_KEY,
      DEFAULT_NOTIFICATION_SETTINGS,
      normalizeNotifications
    )
  );
  const [hydrated, setHydrated] = useState(typeof window === "undefined");

  useEffect(() => {
    if (typeof window === "undefined") {
      setHydrated(true);
      return;
    }

    const nextConfig = readStoredTaxConfig();
    setTaxConfig(nextConfig);
    taxConfigSnapshot = nextConfig;
    setWorkspace(
      readStoredSettings(
        WORKSPACE_SETTINGS_STORAGE_KEY,
        DEFAULT_WORKSPACE_SETTINGS,
        normalizeWorkspace
      )
    );
    setNotifications(
      readStoredSettings(
        NOTIFICATION_SETTINGS_STORAGE_KEY,
        DEFAULT_NOTIFICATION_SETTINGS,
        normalizeNotifications
      )
    );
    setHydrated(true);
  }, []);

  useEffect(() => {
    taxConfigSnapshot = taxConfig;
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(taxConfig));
  }, [hydrated, taxConfig]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(WORKSPACE_SETTINGS_STORAGE_KEY, JSON.stringify(workspace));
  }, [hydrated, workspace]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(notifications));
  }, [hydrated, notifications]);

  const updateTaxConfig = useCallback((updates = {}) => {
    setTaxConfig((current) => normalizeTaxConfig({ ...current, ...(updates || {}) }));
  }, []);

  const resetTaxConfig = useCallback(() => {
    setTaxConfig({ ...DEFAULT_TAX_CONFIG });
  }, []);

  const updateWorkspace = useCallback((updates = {}) => {
    setWorkspace((current) => normalizeWorkspace({ ...current, ...(updates || {}) }));
  }, []);

  const updateNotifications = useCallback((updates = {}) => {
    setNotifications((current) => normalizeNotifications({ ...current, ...(updates || {}) }));
  }, []);

  const value = useMemo(
    () => ({
      taxConfig,
      workspace,
      notifications,
      hydrated,
      updateTaxConfig,
      resetTaxConfig,
      updateWorkspace,
      updateNotifications
    }),
    [
      hydrated,
      notifications,
      resetTaxConfig,
      taxConfig,
      updateNotifications,
      updateTaxConfig,
      updateWorkspace,
      workspace
    ]
  );

  return <SettingsStoreContext.Provider value={value}>{children}</SettingsStoreContext.Provider>;
}

export const useSettingsStore = () => {
  const context = useContext(SettingsStoreContext);
  if (!context) {
    throw new Error("useSettingsStore must be used inside SettingsStoreProvider.");
  }

  return context;
};

export const getTaxConfigSnapshot = () => ({ ...taxConfigSnapshot });
