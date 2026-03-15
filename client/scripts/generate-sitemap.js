const fs = require("fs");
const path = require("path");

const DEFAULT_SITE_URL = "https://arihaanenterprises.in";
const DEFAULT_API_URL = "http://localhost:5000/api";

const STATIC_ROUTES = [
  { routePath: "/", changefreq: "weekly", priority: "1.0" },
  { routePath: "/products", changefreq: "daily", priority: "0.9" },
  { routePath: "/brands", changefreq: "monthly", priority: "0.7" },
  { routePath: "/industries", changefreq: "monthly", priority: "0.7" },
  { routePath: "/about", changefreq: "monthly", priority: "0.6" },
  { routePath: "/contact", changefreq: "monthly", priority: "0.8" },
];

const normalizeBaseUrl = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const resolveSiteUrl = () =>
  normalizeBaseUrl(
    process.env.SITE_URL || process.env.REACT_APP_SITE_URL || DEFAULT_SITE_URL,
  );

const resolveApiBaseUrl = () => {
  const direct = normalizeBaseUrl(process.env.SITEMAP_API_URL || "");
  if (direct) return direct;

  const reactApiUrl = normalizeBaseUrl(process.env.REACT_APP_API_URL || "");
  if (reactApiUrl) return reactApiUrl;

  const backend = normalizeBaseUrl(process.env.REACT_APP_BACKEND_URL || "");
  if (backend) return `${backend}/api`;

  return DEFAULT_API_URL;
};

const escapeXml = (value = "") =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toDateOnlyIso = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const extractProductsFromPayload = (payload = {}) => {
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.data?.products)) return payload.data.products;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.docs)) return payload.docs;
  if (Array.isArray(payload?.data?.docs)) return payload.data.docs;
  if (Array.isArray(payload)) return payload;
  return [];
};

const fetchProducts = async (apiBaseUrl) => {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available in this Node runtime.");
  }

  const endpoint = `${apiBaseUrl}/products`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch products from ${endpoint} (${response.status}).`,
    );
  }

  const data = await response.json();
  return extractProductsFromPayload(data);
};

const buildUrlEntries = async () => {
  const siteUrl = resolveSiteUrl();
  const apiBaseUrl = resolveApiBaseUrl();
  const entriesMap = new Map();

  STATIC_ROUTES.forEach((item) => {
    entriesMap.set(item.routePath, {
      routePath: item.routePath,
      changefreq: item.changefreq,
      priority: item.priority,
      lastmod: "",
    });
  });

  try {
    const products = await fetchProducts(apiBaseUrl);

    products.forEach((product) => {
      const token = String(
        product?.slug || product?._id || product?.id || "",
      ).trim();
      if (!token) return;

      const routePath = `/products/${encodeURIComponent(token)}`;
      const lastmod = toDateOnlyIso(product?.updatedAt || product?.createdAt);

      entriesMap.set(routePath, {
        routePath,
        changefreq: "weekly",
        priority: "0.8",
        lastmod,
      });
    });

    console.log(
      `Sitemap product URLs fetched: ${Math.max(0, entriesMap.size - STATIC_ROUTES.length)}`,
    );
  } catch (error) {
    console.warn(`Sitemap dynamic product fetch skipped: ${error.message}`);
  }

  const entries = [...entriesMap.values()].sort((a, b) =>
    a.routePath.localeCompare(b.routePath),
  );

  return {
    siteUrl,
    entries,
  };
};

const buildSitemapXml = (siteUrl, entries = []) => {
  const urlNodes = entries
    .map((entry) => {
      const loc = `${siteUrl}${entry.routePath}`;
      const lastmodTag = entry.lastmod
        ? `\n    <lastmod>${entry.lastmod}</lastmod>`
        : "";

      return [
        "  <url>",
        `    <loc>${escapeXml(loc)}</loc>`,
        lastmodTag ? lastmodTag.trimEnd() : "",
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlNodes,
    "</urlset>",
    "",
  ].join("\n");
};

const writeSitemap = (xml) => {
  const sitemapPath = path.join(__dirname, "..", "public", "sitemap.xml");
  fs.writeFileSync(sitemapPath, xml, "utf8");
  console.log(`Sitemap written: ${sitemapPath}`);
};

(async () => {
  try {
    const { siteUrl, entries } = await buildUrlEntries();
    const xml = buildSitemapXml(siteUrl, entries);
    writeSitemap(xml);
  } catch (error) {
    console.error(`Sitemap generation failed: ${error.message}`);
    process.exitCode = 1;
  }
})();
