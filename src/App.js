import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import Sidebar from "./components/layout/Sidebar.jsx";
import Topbar from "./components/layout/Topbar";
import Home from "./components/home/Home";
import POS from "./components/POS";
import MenuManagement from "./components/MenuManagement";
import Kitchen from "./components/Kitchen";
import DeliveryManagement from "./components/DeliveryManagement";
import TableManagement from "./components/TableManagement";
import InventorySystem from "./components/InventorySystem";
import OrderManagementDashboard from "./components/OrderManagementDashboard";
import FinanceOverviewPage from "./components/finance/FinanceOverviewPage";
import DocumentsVault from "./components/DocumentsVault";
import SubscriptionStatus from "./components/SubscriptionStatus";
import SuperAdminConsole from "./components/SuperAdminConsole";
import AuthPage from "./components/auth/AuthPage";
import ProfileSettings from "./components/ProfileSettings";
import Unauthorized from "./components/Unauthorized";
import CloudDashboardLayout from "./components/cloud/CloudDashboardLayout";
import CloudDashboardHome from "./components/cloud/CloudDashboardHome";
import BillingTaxSettings from "./components/cloud/BillingTaxSettings";
import GeneralSettingsPage from "./pages/settings/general";
import NotificationSettingsPage from "./pages/settings/notifications";
import IntegrationsSettingsPage from "./pages/settings/integrations";
import StaffSettingsPage from "./pages/settings/staff";
import RolesSettingsPage from "./pages/settings/roles";
import ActivityLogsPage from "./pages/settings/activity";
import CrmModule from "./modules/crm/CrmModule";
import {
  CRM_DEFAULT_PATH,
  CRM_PAGE_KEYS,
  getCrmPathForPage,
  isCrmPage,
  resolveCrmRoute
} from "./modules/crm/routes";

import {
  PAGE_PERMISSIONS,
  getAllowedPagesForRole,
  getLandingPageForRole,
  normalizeBusinessType
} from "./access";
import API_URL from "./config/api";
import { UI_CONFIG } from "./config/uiConfig";
import { useAuthStore } from "./store/authStore";
import { theme, cloudKitchenTheme } from "./theme";
import { hasPermission } from "./utils/permissionEngine";

const TOKEN_STORAGE_KEY = "restaurant_crm_token";
const REFRESH_TOKEN_STORAGE_KEY = "restaurant_crm_refresh_token";
const BUSINESS_TYPE_STORAGE_KEY = "restaurant_crm_business_type";
const ACTIVE_TENANT_STORAGE_KEY = "restaurant_crm_active_tenant_id";
const AUTH_REQUEST_CONFIG = { withCredentials: true };
const MOBILE_BREAKPOINT = 960;
const PAGE_PATHS = Object.freeze({
  HOME: "/dashboard",
  MENU_MANAGEMENT: "/dashboard/menu",
  POS: "/dashboard/pos",
  KITCHEN: "/dashboard/kitchen",
  ORDERS: "/dashboard/orders",
  ORDER_MANAGEMENT: "/dashboard/order-management",
  DELIVERY: "/dashboard/dispatch",
  TABLES: "/tables",
  INVENTORY: "/dashboard/inventory",
  FINANCE_OVERVIEW: "/dashboard/finance/overview",
  [CRM_PAGE_KEYS.CUSTOMERS_OVERVIEW]: CRM_DEFAULT_PATH,
  [CRM_PAGE_KEYS.CUSTOMERS_LIST]: "/dashboard/crm/customers",
  [CRM_PAGE_KEYS.MARKETING]: "/dashboard/crm/marketing",
  DOCUMENTS: "/documents",
  STAFF: "/dashboard/settings/staff",
  ROLES: "/dashboard/settings/roles",
  ACTIVITY_LOGS: "/dashboard/settings/activity",
  GENERAL_SETTINGS: "/dashboard/settings/general",
  NOTIFICATION_SETTINGS: "/dashboard/settings/notifications",
  INTEGRATIONS_SETTINGS: "/dashboard/settings/integrations",
  SUBSCRIPTION: "/subscription",
  PROFILE: "/profile",
  SETTINGS: "/dashboard/settings/general",
  BILLING_TAX_SETTINGS: "/dashboard/settings/billing",
  ADMIN: "/admin"
});
const LEGACY_INVENTORY_PATHS = new Set([
  "/inventory",
  "/inventory/stock-inventory",
  "/inventory/recipe-costing",
  "/inventory/suppliers",
  "/inventory/purchase-orders"
]);
const LEGACY_ORDER_DASHBOARD_PATHS = new Set([
  "/pos/orders",
  "/order-management",
  "/pos/order-management",
  "/pos/order-management/analytics",
  "/reports/order-analytics",
  "/pos/pipeline",
  "/pos/analytics"
]);
const LEGACY_FINANCE_OVERVIEW_PATHS = new Set([
  "/reports",
  "/analytics",
  "/dashboard/finance",
  "/expenses"
]);
const LEGACY_SETTINGS_PATHS = new Map([
  ["/settings", "GENERAL_SETTINGS"],
  ["/settings/general", "GENERAL_SETTINGS"],
  ["/settings/notifications", "NOTIFICATION_SETTINGS"],
  ["/settings/integrations", "INTEGRATIONS_SETTINGS"],
  ["/dashboard/settings/billing-tax", "BILLING_TAX_SETTINGS"],
  ["/settings/billing-tax", "BILLING_TAX_SETTINGS"],
  ["/settings/billing", "BILLING_TAX_SETTINGS"],
  ["/staff", "STAFF"],
  ["/settings/staff", "STAFF"],
  ["/settings/roles", "ROLES"],
  ["/dashboard/settings/activity-logs", "ACTIVITY_LOGS"],
  ["/settings/activity", "ACTIVITY_LOGS"],
  ["/settings/staff-management", "STAFF"],
  ["/settings/roles-permissions", "ROLES"],
  ["/settings/audit", "ACTIVITY_LOGS"]
]);
const LEGACY_PAGE_PATHS = new Map([
  ["/", "HOME"],
  ["/pos", "POS"],
  ["/kitchen", "KITCHEN"],
  ["/menu-management", "MENU_MANAGEMENT"],
  ["/delivery", "DELIVERY"],
  ["/dashboard/orders", "ORDERS"]
]);

const normalizeAppPage = (page = "HOME") => {
  if (["REPORTS", "ANALYTICS", "EXPENSES"].includes(String(page || "").trim().toUpperCase())) {
    return "FINANCE_OVERVIEW";
  }

  return page;
};

const normalizePathname = (pathname = "/") => {
  const rawPath = String(pathname || "/").trim();
  const withLeadingSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const normalized = withLeadingSlash.replace(/\/+/g, "/");

  return normalized.length > 1 ? normalized.replace(/\/$/, "") : normalized;
};

const getPathForPage = (page = "HOME", routeState = {}) => {
  const normalizedPage = normalizeAppPage(page);

  if (isCrmPage(normalizedPage)) {
    return getCrmPathForPage(normalizedPage, routeState);
  }

  return PAGE_PATHS[normalizedPage] || PAGE_PATHS.HOME;
};

const resolvePageFromPathname = (pathname = "/") => {
  const normalizedPathname = normalizePathname(pathname);

  if (UI_CONFIG.DEV_MODE_UNLOCK_ALL && normalizedPathname === PAGE_PATHS.SUBSCRIPTION) {
    return {
      page: "HOME",
      pathname: PAGE_PATHS.HOME
    };
  }

  if (LEGACY_INVENTORY_PATHS.has(normalizedPathname)) {
    return {
      page: "INVENTORY",
      pathname: PAGE_PATHS.INVENTORY,
      routeState: {}
    };
  }

  if (LEGACY_ORDER_DASHBOARD_PATHS.has(normalizedPathname)) {
    return {
      page: "ORDER_MANAGEMENT",
      pathname: PAGE_PATHS.ORDER_MANAGEMENT,
      routeState: {}
    };
  }

  if (LEGACY_FINANCE_OVERVIEW_PATHS.has(normalizedPathname)) {
    return {
      page: "FINANCE_OVERVIEW",
      pathname: PAGE_PATHS.FINANCE_OVERVIEW,
      routeState: {}
    };
  }

  if (LEGACY_SETTINGS_PATHS.has(normalizedPathname)) {
    const page = LEGACY_SETTINGS_PATHS.get(normalizedPathname);
    return {
      page,
      pathname: PAGE_PATHS[page],
      routeState: {}
    };
  }

  if (LEGACY_PAGE_PATHS.has(normalizedPathname)) {
    const page = LEGACY_PAGE_PATHS.get(normalizedPathname);
    return {
      page,
      pathname: PAGE_PATHS[page],
      routeState: {}
    };
  }

  const crmRoute = resolveCrmRoute(normalizedPathname);
  if (crmRoute) {
    return crmRoute;
  }

  const matchedPageEntry = Object.entries(PAGE_PATHS).find(
    ([, pagePath]) => pagePath === normalizedPathname
  );

  return {
    page: matchedPageEntry?.[0] || null,
    pathname: normalizedPathname,
    routeState: {}
  };
};

const syncBrowserPath = (page, routeState = {}, replace = false) => {
  if (typeof window === "undefined") {
    return;
  }

  const nextPathname = getPathForPage(page, routeState);
  if (normalizePathname(window.location.pathname) === nextPathname) {
    return;
  }

  window.history[replace ? "replaceState" : "pushState"](routeState, "", nextPathname);
};

axios.defaults.withCredentials = true;

const appLayout = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 10% 10%, #1e212d 0%, #121319 40%, #09090b 100%)",
  padding: "20px"
};

const authLayout = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 10% 10%, #1e212d 0%, #121319 40%, #09090b 100%)",
  padding: 0
};

const shell = {
  width: "100%",
  height: "calc(100vh - 40px)",
  minHeight: 0,
  display: "flex",
  borderRadius: 24,
  overflow: "hidden",
  background: theme.colors.panelBg,
  border: `1px solid ${theme.colors.panelBorder}`,
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)"
};

const mainArea = {
  flex: 1,
  width: "100%",
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: "#111217"
};

const contentArea = {
  flex: 1,
  width: "100%",
  minWidth: 0,
  minHeight: 0,
  overflowY: "auto",
  padding: "20px 22px 24px"
};

const authGate = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  color: theme.colors.textSecondary,
  fontSize: 15
};

const maintenanceWrap = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px"
};

const maintenanceCard = {
  width: "min(640px, 100%)",
  borderRadius: 22,
  background: theme.colors.panelBg,
  border: `1px solid ${theme.colors.panelBorder}`,
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  padding: "28px 24px"
};

const maintenanceTitle = {
  margin: "0 0 10px",
  color: theme.colors.textPrimary,
  fontSize: 28
};

const maintenanceText = {
  margin: "0 0 12px",
  color: theme.colors.textSecondary,
  fontSize: 15,
  lineHeight: 1.6
};

const maintenanceList = {
  margin: "0 0 18px",
  paddingLeft: 18,
  color: theme.colors.textSecondary,
  lineHeight: 1.7
};

const maintenanceButton = {
  height: 40,
  border: 0,
  borderRadius: 10,
  padding: "0 16px",
  background: theme.colors.sidebarActiveBg,
  color: "#2d2103",
  fontWeight: 800,
  cursor: "pointer"
};

const dbWarningBanner = {
  margin: "0 0 16px",
  padding: "12px 14px",
  borderRadius: 14,
  border: `1px solid ${theme.colors.panelBorder}`,
  background: "rgba(249, 133, 105, 0.1)",
  color: theme.colors.textSecondary,
  fontSize: 14,
  lineHeight: 1.5
};

const dbWarningTitle = {
  margin: "0 0 4px",
  color: theme.colors.textPrimary,
  fontSize: 14,
  fontWeight: 700
};

function App() {
  const setAuthUser = useAuthStore((state) => state.setUser);
  const clearAuthUser = useAuthStore((state) => state.logout);
  const rolePermissions = useAuthStore((state) => state.rolePermissions);
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") {
      return "HOME";
    }

    return resolvePageFromPathname(window.location.pathname).page || "HOME";
  });
  const [routeState, setRouteState] = useState(() => {
    if (typeof window === "undefined") {
      return {};
    }

    return resolvePageFromPathname(window.location.pathname).routeState || {};
  });
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [activeTenantId, setActiveTenantId] = useState("");
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cloudDateRange, setCloudDateRange] = useState({
    key: "today",
    from: "",
    to: ""
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [dbReady, setDbReady] = useState(true);
  const [dbStatusMessage, setDbStatusMessage] = useState("");

  const clearStoredTokens = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(BUSINESS_TYPE_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_TENANT_STORAGE_KEY);
  }, []);

  const clearSessionState = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setRestaurant(null);
    setTenants([]);
    setActiveTenantId("");
    setPage("HOME");
    setRouteState({});
    setCloudDateRange({
      key: "today",
      from: "",
      to: ""
    });
    setNotificationCount(0);
    setIsSidebarOpen(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      setAuthUser(user);
      return;
    }

    clearAuthUser();
  }, [clearAuthUser, isAuthenticated, setAuthUser, user]);

  useEffect(() => {
    const syncViewport = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || !isSidebarOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, isSidebarOpen]);

  const refreshAccessToken = useCallback(async () => {
    const tenantId = window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY) || "";
    const res = await axios.post(
      `${API_URL}/api/auth/refresh`,
      {},
      {
        ...AUTH_REQUEST_CONFIG,
        skipAuthRefresh: true,
        headers: tenantId ? { "X-Tenant-Id": tenantId } : undefined
      }
    );

    return res.data || {};
  }, []);

  useEffect(() => {
    let isRefreshing = false;
    let waitingQueue = [];

    const flushWaitingQueue = (error, token) => {
      waitingQueue.forEach((queued) => {
        if (error) {
          queued.reject(error);
          return;
        }

        queued.resolve(token);
      });

      waitingQueue = [];
    };

    const interceptorId = axios.interceptors.request.use((config) => {
      config.withCredentials = true;
      const tenantId = window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY) || "";
      config.headers = config.headers || {};
      if (tenantId) {
        config.headers["X-Tenant-Id"] = tenantId;
      } else {
        delete config.headers["X-Tenant-Id"];
      }
      return config;
    });

    const responseInterceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config || {};
        const statusCode = error.response?.status;
        const requestUrl = String(originalRequest.url || "");
        const isAuthRequest =
          requestUrl.includes("/api/auth/") && !requestUrl.includes("/api/auth/me");

        if (
          originalRequest.skipAuthRefresh ||
          statusCode !== 401 ||
          isAuthRequest ||
          originalRequest._retry
        ) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            waitingQueue.push({ resolve, reject });
          }).then(() => {
            return axios(originalRequest);
          });
        }

        isRefreshing = true;

        try {
          await refreshAccessToken();
          flushWaitingQueue(null, true);
          return axios(originalRequest);
        } catch (refreshErr) {
          flushWaitingQueue(refreshErr, null);
          clearStoredTokens();
          clearSessionState();
          setAuthError("Session expired. Please login again.");
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptorId);
      axios.interceptors.response.eject(responseInterceptorId);
    };
  }, [clearSessionState, clearStoredTokens, refreshAccessToken]);

  const applySessionState = useCallback((sessionUser, sessionRestaurant, sessionTenants = [], sessionActiveTenantId = "") => {
    if (!sessionUser) {
      clearSessionState();
      return;
    }

    const normalizedTenants = Array.isArray(sessionTenants) ? sessionTenants : [];
    const preferredTenantId =
      String(
        sessionActiveTenantId ||
          window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY) ||
          normalizedTenants[0]?.tenantId ||
          normalizedTenants[0]?.id ||
          sessionRestaurant?.tenantId ||
          sessionRestaurant?.id ||
          ""
      ).trim();
    const nextRestaurant =
      normalizedTenants.find(
        (tenant) =>
          String(tenant?.tenantId || tenant?.id || "") === preferredTenantId
      ) || sessionRestaurant || null;
    const businessType = normalizeBusinessType(
      nextRestaurant?.businessType || sessionUser?.businessType || ""
    );
    window.localStorage.setItem(BUSINESS_TYPE_STORAGE_KEY, businessType);
    if (preferredTenantId) {
      window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, preferredTenantId);
    } else {
      window.localStorage.removeItem(ACTIVE_TENANT_STORAGE_KEY);
    }

    const requestedRoute =
      typeof window === "undefined"
        ? { page: null }
        : resolvePageFromPathname(window.location.pathname);
    const allowedSessionPages = getAllowedPagesForRole(sessionUser.role, businessType, rolePermissions);
    const normalizedAllowedSessionPages = [...allowedSessionPages];
    if (
      businessType === "CLOUD_KITCHEN" &&
      (allowedSessionPages.includes("POS") || allowedSessionPages.includes("KITCHEN"))
    ) {
      normalizedAllowedSessionPages.push("ORDERS");
      normalizedAllowedSessionPages.push("ORDER_MANAGEMENT");
    }
    if (
      businessType === "CLOUD_KITCHEN" &&
      hasPermission({ role: sessionUser.role }, PAGE_PERMISSIONS.BILLING_TAX_SETTINGS)
    ) {
      normalizedAllowedSessionPages.push("BILLING_TAX_SETTINGS");
    }
    if (allowedSessionPages.includes("SETTINGS")) {
      normalizedAllowedSessionPages.push(
        "GENERAL_SETTINGS",
        "NOTIFICATION_SETTINGS",
        "INTEGRATIONS_SETTINGS"
      );
    }
    if (
      allowedSessionPages.includes(CRM_PAGE_KEYS.CUSTOMERS_OVERVIEW) ||
      allowedSessionPages.includes(CRM_PAGE_KEYS.CUSTOMERS_LIST)
    ) {
      normalizedAllowedSessionPages.push(CRM_PAGE_KEYS.CUSTOMER_PROFILE);
    }
    const fallbackPage = normalizeAppPage(
      getLandingPageForRole(sessionUser.role, businessType, rolePermissions)
    );
    const requestedPage = normalizeAppPage(requestedRoute.page);
    const nextPage =
      requestedPage && normalizedAllowedSessionPages.includes(requestedPage)
        ? requestedPage
        : fallbackPage;

    setUser(sessionUser);
    setRestaurant(nextRestaurant);
    setTenants(normalizedTenants);
    setActiveTenantId(preferredTenantId);
    setIsAuthenticated(true);
    setPage(nextPage);
    setRouteState(requestedRoute.routeState || {});
    syncBrowserPath(nextPage, requestedRoute.routeState || {}, true);
  }, [clearSessionState, rolePermissions]);

  const fetchSessionProfile = useCallback(async () => {
    const tenantId = window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY) || "";
    const res = await axios.get(`${API_URL}/api/auth/me`, {
      ...AUTH_REQUEST_CONFIG,
      headers: tenantId ? { "X-Tenant-Id": tenantId } : undefined
    });

    return res.data || {};
  }, []);

  const loadDatabaseStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/ready`, {
        skipAuthRefresh: true,
        validateStatus: () => true
      });

      const ready =
        res.status === 200 &&
        (Boolean(res.data?.dbReady) || Boolean(res.data?.fallbackMode));
      const isDevelopmentRuntime =
        String(process.env.NODE_ENV || "").toLowerCase() !== "production";
      setDbReady(ready || isDevelopmentRuntime);
      setDbStatusMessage(
        ready
          ? ""
          : "Database connection is not ready. Update backend/.env with a valid MONGO_URI and set SKIP_DB_CONNECT=false to unlock CRM modules."
      );
    } catch (err) {
      console.error(err);
      const isDevelopmentRuntime =
        String(process.env.NODE_ENV || "").toLowerCase() !== "production";
      setDbReady(isDevelopmentRuntime);
      setDbStatusMessage(
        "Unable to reach the backend readiness endpoint. Confirm the backend is running on port 5000 and that MongoDB is configured."
      );
    }
  }, []);

  const initializeSession = useCallback(async () => {
    try {
      setAuthError("");
      setAuthReady(false);
      clearStoredTokens();

      let profile;
      try {
        profile = await fetchSessionProfile();
      } catch (profileErr) {
        if (profileErr.response?.status !== 401) {
          throw profileErr;
        }

        await refreshAccessToken();
        profile = await fetchSessionProfile();
      }

      applySessionState(profile.user, profile.restaurant, profile.tenants, profile.activeTenantId);
      await loadDatabaseStatus();
    } catch (err) {
      if (err.response?.status && [401, 400].includes(err.response.status)) {
        clearSessionState();
        return;
      }

      console.error(err);
      clearStoredTokens();
      clearSessionState();
      setAuthError("Unable to initialize session");
    } finally {
      setAuthReady(true);
    }
  }, [
    applySessionState,
    clearSessionState,
    clearStoredTokens,
    fetchSessionProfile,
    loadDatabaseStatus,
    refreshAccessToken
  ]);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncPageFromLocation = () => {
      const resolvedRoute = resolvePageFromPathname(window.location.pathname);
      const currentPathname = normalizePathname(window.location.pathname);

      if (resolvedRoute.pathname !== currentPathname) {
        window.history.replaceState(window.history.state, "", resolvedRoute.pathname);
      }

      if (resolvedRoute.page) {
        setPage(resolvedRoute.page);
        setRouteState(resolvedRoute.routeState || {});
      }
    };

    syncPageFromLocation();
    window.addEventListener("popstate", syncPageFromLocation);

    return () => {
      window.removeEventListener("popstate", syncPageFromLocation);
    };
  }, []);

  const handleAuthSuccess = async ({ user: loginUser } = {}) => {
    try {
      const profile = await fetchSessionProfile();
      applySessionState(
        profile.user || loginUser,
        profile.restaurant || null,
        profile.tenants,
        profile.activeTenantId
      );
      await loadDatabaseStatus();
      setAuthError("");
    } catch (err) {
      console.error(err);
      clearStoredTokens();
      clearSessionState();
      setAuthError(err.response?.data?.message || "Unable to load account profile");
    }
  };

  const handleLogout = useCallback(async () => {
    try {
      await axios.post(
        `${API_URL}/api/auth/logout`,
        {},
        { ...AUTH_REQUEST_CONFIG, skipAuthRefresh: true }
      );
    } catch (err) {
      console.error(err);
    } finally {
      clearStoredTokens();
      clearSessionState();
      setAuthError("");
      setDbReady(true);
      setDbStatusMessage("");
    }
  }, [clearSessionState, clearStoredTokens]);

  const handleRestaurantUpdated = useCallback((nextRestaurant) => {
    if (!nextRestaurant) {
      return;
    }

    setRestaurant((prev) => ({
      ...(prev || {}),
      ...nextRestaurant
    }));
  }, []);

  const handleTenantChange = useCallback(
    async (nextTenantId) => {
      const tenantId = String(nextTenantId || "").trim();
      if (!tenantId || tenantId === activeTenantId) {
        return;
      }

      try {
        await axios.post(`${API_URL}/api/auth/select-tenant`, { tenantId }, AUTH_REQUEST_CONFIG);
      } catch (err) {
        setAuthError(err.response?.data?.message || "Unable to switch workspace");
        return;
      }

      const selectedTenant =
        tenants.find((tenant) => String(tenant?.tenantId || tenant?.id || "") === tenantId) || null;
      if (selectedTenant) {
        setRestaurant(selectedTenant);
        setUser((prev) => (prev ? { ...prev, role: selectedTenant.role || prev.role } : prev));
      }
      setActiveTenantId(tenantId);
      window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, tenantId);

      try {
        const profile = await fetchSessionProfile();
        applySessionState(profile.user, profile.restaurant, profile.tenants, profile.activeTenantId);
        setAuthError("");
      } catch (err) {
        setAuthError(err.response?.data?.message || "Unable to refresh tenant session");
      }
    },
    [activeTenantId, applySessionState, fetchSessionProfile, tenants]
  );

  const handleUserUpdated = useCallback((nextUser) => {
    if (!nextUser) {
      return;
    }

    setUser((prev) => ({
      ...(prev || {}),
      ...nextUser
    }));
  }, []);

  const resolvedBusinessType = useMemo(() => {
    if (typeof window === "undefined") {
      return normalizeBusinessType(restaurant?.businessType || user?.businessType || "");
    }

    return normalizeBusinessType(
      restaurant?.businessType ||
      user?.businessType ||
      window.localStorage.getItem(BUSINESS_TYPE_STORAGE_KEY) ||
      ""
    );
  }, [restaurant?.businessType, user?.businessType]);

  const allowedPages = useMemo(() => {
    const basePages = getAllowedPagesForRole(user?.role, resolvedBusinessType, rolePermissions);
    const nextPages = [...basePages];
    const addPage = (pageKey) => {
      if (!nextPages.includes(pageKey)) {
        nextPages.push(pageKey);
      }
    };

    if (basePages.includes("KITCHEN")) {
      addPage("ORDERS");
      addPage("ORDER_MANAGEMENT");
    }
    if (
      resolvedBusinessType === "CLOUD_KITCHEN" &&
      (basePages.includes("POS") || basePages.includes("KITCHEN"))
    ) {
      addPage("ORDERS");
      addPage("ORDER_MANAGEMENT");
    }
    if (
      resolvedBusinessType === "CLOUD_KITCHEN" &&
      hasPermission({ role: user?.role }, PAGE_PERMISSIONS.BILLING_TAX_SETTINGS, rolePermissions)
    ) {
      addPage("BILLING_TAX_SETTINGS");
    }
    if (basePages.includes("PROFILE")) {
      addPage("SETTINGS");
    }
    if (basePages.includes("SETTINGS") || basePages.includes("PROFILE")) {
      addPage("GENERAL_SETTINGS");
      addPage("NOTIFICATION_SETTINGS");
      addPage("INTEGRATIONS_SETTINGS");
    }
    if (
      basePages.includes(CRM_PAGE_KEYS.CUSTOMERS_OVERVIEW) ||
      basePages.includes(CRM_PAGE_KEYS.CUSTOMERS_LIST)
    ) {
      addPage(CRM_PAGE_KEYS.CUSTOMER_PROFILE);
    }

    return nextPages;
  }, [resolvedBusinessType, rolePermissions, user?.role]);
  const workspaceName =
    user?.role === "SUPER_ADMIN" ? "Platform Admin" : (restaurant?.name || "Restaurant");
  const isCloudKitchenWorkspace = resolvedBusinessType === "CLOUD_KITCHEN";
  const canOpenProfile = allowedPages.includes("PROFILE") || allowedPages.includes("SETTINGS");
  const handlePageChange = useCallback((nextPage, nextRouteState = {}) => {
    const normalizedPage = normalizeAppPage(nextPage);
    setPage(normalizedPage);
    setRouteState(nextRouteState || {});
    syncBrowserPath(normalizedPage, nextRouteState || {});
    setIsSidebarOpen(false);
  }, []);
  const handleBrandClick = useCallback(() => {
    handlePageChange("HOME");
  }, [handlePageChange]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    if (!allowedPages.includes(page)) {
      const storedBusinessType = window.localStorage.getItem(BUSINESS_TYPE_STORAGE_KEY) || "";
      const fallbackPage = normalizeAppPage(
        getLandingPageForRole(user.role, storedBusinessType, rolePermissions)
      );
      setPage(fallbackPage);
      setRouteState({});
      syncBrowserPath(fallbackPage, {}, true);
    }
  }, [allowedPages, isAuthenticated, page, rolePermissions, user]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const cloudKitchenBodyClass = "cloud-kitchen-workspace";
    const previousBackground = document.body.style.background;
    const previousColor = document.body.style.color;

    if (isAuthenticated && isCloudKitchenWorkspace) {
      document.body.classList.add(cloudKitchenBodyClass);
      document.body.style.background = cloudKitchenTheme.appBg;
      document.body.style.color = cloudKitchenTheme.textPrimary;
    } else {
      document.body.classList.remove(cloudKitchenBodyClass);
      document.body.style.background = previousBackground || "";
      document.body.style.color = previousColor || "";
    }

    return () => {
      document.body.classList.remove(cloudKitchenBodyClass);
      document.body.style.background = previousBackground;
      document.body.style.color = previousColor;
    };
  }, [isAuthenticated, isCloudKitchenWorkspace]);

  const pageLayout = authReady && !isAuthenticated
    ? authLayout
    : isCloudKitchenWorkspace
      ? {
          minHeight: "100vh",
          background: cloudKitchenTheme.appBg,
          padding: 0
        }
      : {
        ...appLayout,
        padding: isMobile ? 0 : appLayout.padding
      };
  const showDatabaseMaintenance = authReady && isAuthenticated && !dbReady;
  const showDatabaseWarning =
    authReady && isAuthenticated && Boolean(dbStatusMessage) && dbReady;
  const shellStyle = isMobile
    ? {
        ...shell,
        maxWidth: "100%",
        height: "100vh",
        minHeight: 0,
        borderRadius: 0,
        position: "relative"
      }
    : shell;
  const mainAreaStyle = isMobile
    ? {
        ...mainArea,
        minWidth: 0
      }
    : mainArea;
  const contentAreaStyle = isMobile
    ? {
        ...contentArea,
        padding: "16px 14px 20px"
      }
    : contentArea;

  const renderWorkspacePage = () => {
    const pagePermission = PAGE_PERMISSIONS[page];
    if (pagePermission && !hasPermission(user, pagePermission, rolePermissions)) {
      return <Unauthorized />;
    }

    if (page === "HOME") {
      if (isCloudKitchenWorkspace) {
        return (
          <CloudDashboardHome
            tenantId={activeTenantId || restaurant?.tenantId || restaurant?.id || ""}
            dateRange={cloudDateRange}
            onDateRangeChange={setCloudDateRange}
            onNavigate={handlePageChange}
            onNotificationCountChange={setNotificationCount}
            allowedPages={allowedPages}
            userRole={user?.role}
          />
        );
      }

      return <Home user={user} onNavigate={handlePageChange} />;
    }

    if (page === "MENU_MANAGEMENT") {
      return <MenuManagement />;
    }

    if (page === "POS") {
      return <POS userRole={user?.role} />;
    }

    if (page === "KITCHEN") {
      return <Kitchen />;
    }

    if (page === "ORDERS" || page === "ORDER_MANAGEMENT") {
      return <OrderManagementDashboard />;
    }

    if (page === "DELIVERY") {
      return <DeliveryManagement />;
    }

    if (page === "TABLES") {
      return <TableManagement />;
    }

    if (page === "INVENTORY") {
      return <InventorySystem />;
    }

    if (page === "FINANCE_OVERVIEW") {
      return <FinanceOverviewPage businessType={resolvedBusinessType} />;
    }

    if (isCrmPage(page)) {
      return (
        <CrmModule
          page={page}
          routeState={routeState}
          onNavigate={handlePageChange}
        />
      );
    }

    if (page === "DOCUMENTS") {
      return <DocumentsVault />;
    }

    if (page === "STAFF") {
      return <StaffSettingsPage />;
    }

    if (page === "ROLES") {
      return <RolesSettingsPage />;
    }

    if (page === "ACTIVITY_LOGS") {
      return <ActivityLogsPage />;
    }

    if (page === "GENERAL_SETTINGS") {
      return <GeneralSettingsPage />;
    }

    if (page === "NOTIFICATION_SETTINGS") {
      return <NotificationSettingsPage />;
    }

    if (page === "INTEGRATIONS_SETTINGS") {
      return <IntegrationsSettingsPage />;
    }

    if (page === "SUBSCRIPTION") {
      if (UI_CONFIG.DEV_MODE_UNLOCK_ALL) {
        return null;
      }

      return <SubscriptionStatus restaurant={restaurant} />;
    }

    if (page === "BILLING_TAX_SETTINGS") {
      return <BillingTaxSettings />;
    }

    if (page === "PROFILE" || page === "SETTINGS") {
      return (
        <ProfileSettings
          user={user}
          restaurant={restaurant}
          onRestaurantUpdated={handleRestaurantUpdated}
          onUserUpdated={handleUserUpdated}
        />
      );
    }

    if (page === "ADMIN") {
      return <SuperAdminConsole />;
    }

    return null;
  };

  return (
    <div style={pageLayout}>
      {!authReady ? (
        <div style={authGate}>Initializing session...</div>
      ) : !isAuthenticated ? (
        <AuthPage
          onAuthSuccess={handleAuthSuccess}
          errorMessage={authError}
          onClearError={() => setAuthError("")}
        />
      ) : showDatabaseMaintenance ? (
        <div style={maintenanceWrap}>
          <div style={maintenanceCard}>
            <h2 style={maintenanceTitle}>Website is running, but MongoDB is offline</h2>
            <p style={maintenanceText}>
              The CRM server started successfully, but the database is disabled or not connected.
            </p>
            <p style={maintenanceText}>{dbStatusMessage}</p>
            <ul style={maintenanceList}>
              <li>Open `backend/.env`</li>
              <li>Set `SKIP_DB_CONNECT=false`</li>
              <li>Replace `MONGO_URI` with a valid MongoDB connection string</li>
              <li>Restart the server with `npm run start`</li>
            </ul>
            <button style={maintenanceButton} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      ) : (
        isCloudKitchenWorkspace ? (
          <CloudDashboardLayout
            currentPage={page}
            onNavigate={handlePageChange}
            allowedPages={allowedPages}
            workspaceName={workspaceName}
            user={user}
            restaurant={restaurant}
            tenants={tenants}
            activeTenantId={activeTenantId}
            onTenantChange={handleTenantChange}
            onToggleSidebar={isMobile ? () => setIsSidebarOpen((open) => !open) : undefined}
            isMobile={isMobile}
            isSidebarOpen={isSidebarOpen}
            onCloseSidebar={() => setIsSidebarOpen(false)}
            onLogout={handleLogout}
            onOpenProfile={canOpenProfile ? () => handlePageChange("SETTINGS") : undefined}
            dateRange={cloudDateRange}
            onDateRangeChange={setCloudDateRange}
            notificationCount={notificationCount}
          >
            {showDatabaseWarning ? (
              <div style={dbWarningBanner}>
                <div style={dbWarningTitle}>Backend Warning</div>
                <div>{dbStatusMessage}</div>
              </div>
            ) : null}
            {renderWorkspacePage()}
          </CloudDashboardLayout>
        ) : (
          <div style={shellStyle}>
            {isMobile ? (
              <>
                {isSidebarOpen ? (
                  <div style={mobileSidebarBackdrop} onClick={() => setIsSidebarOpen(false)} />
                ) : null}
                <div
                  style={{
                    ...mobileSidebarPanel,
                    transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)"
                  }}
                >
                  <Sidebar
                    currentPage={page}
                    goTo={handlePageChange}
                    user={user}
                    userRole={user?.role}
                    restaurantName={workspaceName}
                    businessType={resolvedBusinessType}
                    onLogout={handleLogout}
                    onOpenProfile={canOpenProfile ? () => handlePageChange("PROFILE") : undefined}
                  />
                </div>
              </>
            ) : (
              <Sidebar
                currentPage={page}
                goTo={handlePageChange}
                user={user}
                userRole={user?.role}
                restaurantName={workspaceName}
                businessType={resolvedBusinessType}
                onLogout={handleLogout}
                onOpenProfile={canOpenProfile ? () => handlePageChange("PROFILE") : undefined}
              />
            )}

            <div style={mainAreaStyle}>
              <Topbar
                page={page}
                user={user}
                restaurant={restaurant}
                tenants={tenants}
                activeTenantId={activeTenantId}
                onTenantChange={handleTenantChange}
                restaurantName={workspaceName}
                onLogout={handleLogout}
                onOpenProfile={canOpenProfile ? () => handlePageChange("PROFILE") : undefined}
                hideAccountMenu
                isMobile={isMobile}
                onToggleSidebar={isMobile ? () => setIsSidebarOpen((open) => !open) : undefined}
                onBrandClick={handleBrandClick}
              />

              <div style={contentAreaStyle}>
                {showDatabaseWarning ? (
                  <div style={dbWarningBanner}>
                    <div style={dbWarningTitle}>Backend Warning</div>
                    <div>{dbStatusMessage}</div>
                  </div>
                ) : null}
                {renderWorkspacePage()}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default App;

const mobileSidebarBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(3, 6, 12, 0.68)",
  zIndex: 19
};

const mobileSidebarPanel = {
  position: "fixed",
  inset: "0 auto 0 0",
  width: "min(82vw, 280px)",
  height: "100dvh",
  zIndex: 20,
  transition: "transform 180ms ease"
};
