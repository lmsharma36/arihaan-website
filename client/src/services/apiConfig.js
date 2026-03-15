const DEFAULT_API_PORT = process.env.REACT_APP_API_PORT || "5000";

const normalizeBaseUrl = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const getRuntimeHost = () => {
  if (typeof window === "undefined") return "localhost";
  return window.location.hostname || "localhost";
};

const getRuntimeProtocol = () => {
  if (typeof window === "undefined") return "http:";
  return window.location.protocol === "https:" ? "https:" : "http:";
};

export const getApiBaseUrl = () => {
  const envApiUrl = normalizeBaseUrl(process.env.REACT_APP_API_URL);
  if (envApiUrl) return envApiUrl;

  const protocol = getRuntimeProtocol();
  const host = getRuntimeHost();
  return `${protocol}//${host}:${DEFAULT_API_PORT}/api`;
};

export const getBackendBaseUrl = () => {
  const envBackendUrl = normalizeBaseUrl(process.env.REACT_APP_BACKEND_URL);
  if (envBackendUrl) return envBackendUrl;

  const apiBaseUrl = getApiBaseUrl();
  if (apiBaseUrl.endsWith("/api")) {
    return apiBaseUrl.slice(0, -4);
  }

  return apiBaseUrl;
};

export const getAssetBaseUrl = () => {
  const envAssetBaseUrl = normalizeBaseUrl(
    process.env.REACT_APP_ASSET_BASE_URL,
  );
  if (envAssetBaseUrl) return envAssetBaseUrl;

  return getBackendBaseUrl();
};

export const getAssetUrl = (assetPath = "") => {
  if (!assetPath) return "";
  if (/^https?:\/\//i.test(assetPath)) return assetPath;

  const normalizedPath = String(assetPath).startsWith("/")
    ? assetPath
    : `/${assetPath}`;
  const baseUrl = normalizedPath.startsWith("/uploads/")
    ? getAssetBaseUrl()
    : getBackendBaseUrl();

  return `${baseUrl}${normalizedPath}`;
};
