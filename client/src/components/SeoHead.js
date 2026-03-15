import { useEffect } from "react";
import {
  SITE_NAME,
  buildAbsoluteUrl,
  getDefaultSeoImageUrl,
} from "../utils/seo";

const SEO_SCRIPT_SELECTOR = 'script[data-seo-head="true"]';

const ensureMetaTag = (selector, attributes = {}) => {
  let tag = document.head.querySelector(selector);

  if (!tag) {
    tag = document.createElement("meta");
    document.head.appendChild(tag);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    tag.setAttribute(key, value);
  });

  return tag;
};

const ensureCanonicalLink = (href) => {
  let link = document.head.querySelector('link[rel="canonical"]');

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
};

const normalizeStructuredData = (structuredData) => {
  if (!structuredData) return [];
  return (
    Array.isArray(structuredData) ? structuredData : [structuredData]
  ).filter(Boolean);
};

const SeoHead = ({
  title,
  description,
  canonicalPath = "/",
  image,
  type = "website",
  robots = "index,follow",
  structuredData,
  noIndex = false,
}) => {
  useEffect(() => {
    const resolvedTitle = String(
      title || `${SITE_NAME} | Industrial Safety Equipment Supplier`,
    ).trim();
    const resolvedDescription = String(
      description ||
        "Trusted PPE and industrial safety equipment supplier in India.",
    ).trim();
    const resolvedCanonicalUrl = buildAbsoluteUrl(canonicalPath || "/");
    const resolvedImageUrl = image
      ? buildAbsoluteUrl(image)
      : getDefaultSeoImageUrl();
    const resolvedRobots = noIndex ? "noindex,nofollow" : robots;
    const googleSiteVerification = String(
      process.env.REACT_APP_GOOGLE_SITE_VERIFICATION || "",
    ).trim();
    const bingSiteVerification = String(
      process.env.REACT_APP_BING_SITE_VERIFICATION || "",
    ).trim();
    const nextStructuredData = normalizeStructuredData(structuredData);

    document.title = resolvedTitle;

    ensureMetaTag('meta[name="description"]', {
      name: "description",
      content: resolvedDescription,
    });
    ensureMetaTag('meta[name="robots"]', {
      name: "robots",
      content: resolvedRobots,
    });
    ensureMetaTag('meta[property="og:site_name"]', {
      property: "og:site_name",
      content: SITE_NAME,
    });
    ensureMetaTag('meta[property="og:title"]', {
      property: "og:title",
      content: resolvedTitle,
    });
    ensureMetaTag('meta[property="og:description"]', {
      property: "og:description",
      content: resolvedDescription,
    });
    ensureMetaTag('meta[property="og:type"]', {
      property: "og:type",
      content: type,
    });
    ensureMetaTag('meta[property="og:locale"]', {
      property: "og:locale",
      content: "en_IN",
    });
    ensureMetaTag('meta[property="og:url"]', {
      property: "og:url",
      content: resolvedCanonicalUrl,
    });
    ensureMetaTag('meta[property="og:image"]', {
      property: "og:image",
      content: resolvedImageUrl,
    });
    ensureMetaTag('meta[property="og:image:alt"]', {
      property: "og:image:alt",
      content: `${SITE_NAME} preview image`,
    });
    ensureMetaTag('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    ensureMetaTag('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: resolvedTitle,
    });
    ensureMetaTag('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: resolvedDescription,
    });
    ensureMetaTag('meta[name="twitter:image"]', {
      name: "twitter:image",
      content: resolvedImageUrl,
    });

    if (googleSiteVerification) {
      ensureMetaTag('meta[name="google-site-verification"]', {
        name: "google-site-verification",
        content: googleSiteVerification,
      });
    }

    if (bingSiteVerification) {
      ensureMetaTag('meta[name="msvalidate.01"]', {
        name: "msvalidate.01",
        content: bingSiteVerification,
      });
    }

    ensureCanonicalLink(resolvedCanonicalUrl);

    document
      .querySelectorAll(SEO_SCRIPT_SELECTOR)
      .forEach((node) => node.parentNode?.removeChild(node));

    nextStructuredData.forEach((entry) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-head", "true");
      script.text = JSON.stringify(entry);
      document.head.appendChild(script);
    });

    return () => {
      document
        .querySelectorAll(SEO_SCRIPT_SELECTOR)
        .forEach((node) => node.parentNode?.removeChild(node));
    };
  }, [
    canonicalPath,
    description,
    image,
    noIndex,
    robots,
    structuredData,
    title,
    type,
  ]);

  return null;
};

export default SeoHead;
