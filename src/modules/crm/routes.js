export const CRM_PAGE_KEYS = Object.freeze({
  CUSTOMERS_OVERVIEW: "CRM_CUSTOMERS_OVERVIEW",
  CUSTOMERS_LIST: "CRM_CUSTOMERS_LIST",
  CUSTOMER_PROFILE: "CRM_CUSTOMER_PROFILE",
  MARKETING: "CRM_MARKETING"
});

export const CRM_DEFAULT_PATH = "/dashboard/crm/overview";

export const LEGACY_CRM_PATHS = new Map([
  ["/customers", CRM_DEFAULT_PATH],
  ["/marketing", "/dashboard/crm/marketing"],
  ["/crm", CRM_DEFAULT_PATH]
]);

const normalizePathname = (pathname = "/") => {
  const rawPath = String(pathname || "/").trim();
  const withLeadingSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const normalized = withLeadingSlash.replace(/\/+/g, "/");

  return normalized.length > 1 ? normalized.replace(/\/$/, "") : normalized;
};

export const getCrmPathForPage = (page, routeState = {}) => {
  if (page === CRM_PAGE_KEYS.CUSTOMERS_OVERVIEW) {
    return "/dashboard/crm/overview";
  }

  if (page === CRM_PAGE_KEYS.CUSTOMERS_LIST) {
    return "/dashboard/crm/customers";
  }

  if (page === CRM_PAGE_KEYS.MARKETING) {
    return "/dashboard/crm/marketing";
  }

  if (page === CRM_PAGE_KEYS.CUSTOMER_PROFILE) {
    const customerId = String(routeState?.customerId || "").trim();
    return customerId ? `/dashboard/crm/customers/${customerId}` : "/dashboard/crm/customers";
  }

  return CRM_DEFAULT_PATH;
};

export const resolveCrmRoute = (pathname = "/") => {
  const normalizedPathname = normalizePathname(pathname);
  const legacyRedirect = LEGACY_CRM_PATHS.get(normalizedPathname);

  if (legacyRedirect) {
    return {
      page: legacyRedirect === "/dashboard/crm/marketing"
        ? CRM_PAGE_KEYS.MARKETING
        : CRM_PAGE_KEYS.CUSTOMERS_OVERVIEW,
      pathname: legacyRedirect,
      routeState: {}
    };
  }

  if (normalizedPathname === "/dashboard/crm/overview" || normalizedPathname === "/crm/customers/overview") {
    return {
      page: CRM_PAGE_KEYS.CUSTOMERS_OVERVIEW,
      pathname: CRM_DEFAULT_PATH,
      routeState: {}
    };
  }

  if (normalizedPathname === "/dashboard/crm/customers" || normalizedPathname === "/crm/customers/list") {
    return {
      page: CRM_PAGE_KEYS.CUSTOMERS_LIST,
      pathname: "/dashboard/crm/customers",
      routeState: {}
    };
  }

  if (normalizedPathname === "/dashboard/crm/marketing" || normalizedPathname === "/crm/marketing") {
    return {
      page: CRM_PAGE_KEYS.MARKETING,
      pathname: "/dashboard/crm/marketing",
      routeState: {}
    };
  }

  const customerProfileMatch =
    normalizedPathname.match(/^\/dashboard\/crm\/customers\/([^/]+)$/) ||
    normalizedPathname.match(/^\/crm\/customers\/([^/]+)$/);
  if (customerProfileMatch) {
    return {
      page: CRM_PAGE_KEYS.CUSTOMER_PROFILE,
      pathname: `/dashboard/crm/customers/${customerProfileMatch[1]}`,
      routeState: {
        customerId: customerProfileMatch[1]
      }
    };
  }

  return null;
};

export const isCrmPage = (page = "") =>
  Object.values(CRM_PAGE_KEYS).includes(String(page || "").trim());
