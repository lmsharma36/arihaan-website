const SITE_NAME = "ARIHAAN ENTERPRISES";
const SITE_URL = "https://arihaanenterprises.in";
const DEFAULT_SEO_IMAGE_PATH = "/safetyImage.jpg";

const normalizePath = (value = "/") => {
  if (!value) return "/";
  if (/^https?:\/\//i.test(String(value))) return String(value);

  const trimmed = String(value).trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

export const buildAbsoluteUrl = (value = "/") => {
  const normalized = normalizePath(value);
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${SITE_URL}${normalized}`;
};

export const getDefaultSeoImageUrl = () =>
  buildAbsoluteUrl(DEFAULT_SEO_IMAGE_PATH);

export const getProductPath = (product = {}) => {
  const token = String(
    product?.slug || product?._id || product?.id || "",
  ).trim();
  return token ? `/products/${encodeURIComponent(token)}` : "/products";
};

export const getCategoryLabelFromSlug = (value = "") =>
  String(value || "")
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

export { SITE_NAME, SITE_URL };
