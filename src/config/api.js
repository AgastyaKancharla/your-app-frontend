const configuredApiUrl = String(process.env.REACT_APP_API_URL || "").trim();

const isLocalFrontend =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

const API_URL =
  configuredApiUrl || (process.env.NODE_ENV === "development" && isLocalFrontend
    ? "http://localhost:5000"
    : "");

export default API_URL;
