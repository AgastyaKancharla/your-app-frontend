const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

const isLocalHostname = (hostname = "") => {
  return LOCAL_HOSTNAMES.has(String(hostname || "").trim().toLowerCase());
};

const buildLocalApiBaseUrl = (locationObject) => {
  const protocol = locationObject?.protocol || "http:";
  const hostname = locationObject?.hostname || "localhost";
  return `${protocol}//${hostname}:5000`;
};

const normalizeApiBaseUrl = (value) => {
  const configured = String(value || "").trim().replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    const { hostname, port } = window.location;
    const localRuntime = isLocalHostname(hostname);
    const forceConfiguredApi =
      String(process.env.REACT_APP_FORCE_CONFIGURED_API || "false").trim().toLowerCase() ===
      "true";

    // Keep localhost previews stable even when production API is baked into the frontend build.
    if (localRuntime && !forceConfiguredApi) {
      if (!configured) {
        return buildLocalApiBaseUrl(window.location);
      }

      try {
        const configuredHost = new URL(configured).hostname;
        if (!isLocalHostname(configuredHost)) {
          return buildLocalApiBaseUrl(window.location);
        }
      } catch {
        return buildLocalApiBaseUrl(window.location);
      }
    }

    // Keep the zero-config local development flow working with CRA on :3000.
    if (!configured && port === "3000" && hostname) {
      return buildLocalApiBaseUrl(window.location);
    }
  }

  return configured;
};

export const API_BASE_URL = normalizeApiBaseUrl(process.env.REACT_APP_API_URL);
