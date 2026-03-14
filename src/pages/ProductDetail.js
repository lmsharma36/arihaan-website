import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import ProductGallery from "../components/ProductGallery";
import ProductUpload from "../components/ProductUpload";
import ProductSchemaAssistant from "../components/ProductSchemaAssistant";
import SeoHead from "../components/SeoHead";
import "../styles/ProductDetail.css";
import {
  extractProductsFromResponse,
  extractSingleProductFromResponse,
  normalizeProduct,
} from "../utils/productAdapter";
import { getApiBaseUrl, getAssetUrl } from "../services/apiConfig";
import {
  buildAbsoluteUrl,
  getCategoryLabelFromSlug,
  getDefaultSeoImageUrl,
  getProductPath,
} from "../utils/seo";

const API_URL = getApiBaseUrl();
const PRODUCTS_PENDING_RESTORE_KEY = "productsPendingRestore";
const categoriesMap = {
  "head-hearing-protection": "🪖",
  "eye-face-protection": "🥽",
  "respiratory-protection": "😷",
  "hand-arm-protection": "🧤",
  "protective-clothing": "👷",
  "safety-footwear": "🥾",
  "fall-protection": "🪂",
  "traffic-safety-signage": "🚦",
  "confined-space-equipment": "⚙️",
  "fire-safety": "🔥",
};

const getCategoryIcon = (categoryId) => categoriesMap[categoryId] || "🛡️";

const stripGstFromLabel = (label = "") =>
  String(label)
    .replace(/\s*\+?\s*\d+%\s*GST/gi, "")
    .replace(/\s*\+?\s*GST/gi, "")
    .trim();

const formatSpecificationKey = (key = "") => {
  const toAsciiDoubleQuotes = (text = "") =>
    String(text).replace(/[“”„‟«»〝〞＂]/g, '"');

  const rawKey = String(key || "");
  const normalized = rawKey
    .replace(/[_-]+/g, " ")
    .replace(/\(\s*\(/g, "(")
    .replace(/\)\s*\)/g, ")")
    .replace(/\s+/g, " ")
    .trim();
  const lowerKey = normalized
    .toLowerCase()
    .replace(/[“”„‟«»〝〞＂]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  const canonicalKey = lowerKey
    .replace(/["'()/:+,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const rawKeyToken = rawKey.toLowerCase().replace(/\s+/g, "").trim();
  if (rawKeyToken.includes("toxic_twin_function")) {
    return toAsciiDoubleQuotes('"Toxic twin" function');
  }

  if (canonicalKey.includes("toxic twin")) {
    return toAsciiDoubleQuotes('"Toxic twin" function');
  }

  if (normalized.toLowerCase() === "available lengths m") {
    return "Available Lengths (Meter)";
  }

  const customCaseMap = {
    "cc vision gas vision": "CC Vision/ Gas Vision",
    "x zone 5500 5800 compatibility": "X-zone 5500/5800 Compatibility",
    "x am pump compatibility": "X-am Pump Compatibility",
    "catex sensor catex sr": "CatEx sensor (CatEx SR)",
    "ir sensor xd ir": "IR sensor (XD-IR)",
    "pid neo": "PID neo",
    "xxs standard sensors supported": "XXS Standard sensors Supported",
    "xxs special sensors": "XXS Special sensors",
    "catex full range function": "CatEx full range function",
    "toxic twin function": "\u0022Toxic twin\u0022 function",
    "bodyguard motionless monitoring":
      "Bodyguard function: motionless monitoring / manual distress alarm",
    "bodyguard function motionless monitoring manual distress alarm":
      "Bodyguard function: motionless monitoring / manual distress alarm",
    "ir lel xxs h2 hc signal combination":
      "IR LEL-sensor + XXS H2 HC: signal combination",
    "ir lel sensor xxs h2 hc signal combination":
      "IR LEL-sensor + XXS H2 HC: signal combination",
    "toe cap impact resistance j": "Toe Cap Impact Resistance (Joule)",
    "toe cap compression resistance kn": "Toe Cap Compression Resistance (KN)",
    "electrical resistance max kv": "Electrical Resistance Max (KV)",
    "working potential kv": "Working Potential (KV)",
    "threshold potential kv": "Threshold Potential (KV)",
    "heat resistance max c": "Heat Resistance Max (°C)",
    "atpv rating cal cm2": "ATPV Rating (cal/cm2)",
    "actual atpv rating cal cm2": "Actual ATPV Rating (cal/cm2)",
    "fabric gsm": "Fabric GSM",
  };

  if (customCaseMap[canonicalKey]) {
    return toAsciiDoubleQuotes(customCaseMap[canonicalKey]);
  }

  const withUnits = normalized
    .split(/(\([^)]*\))/g)
    .map((part) => {
      if (part.startsWith("(") && part.endsWith(")")) {
        return part;
      }

      return part
        .replace(/\brange\s+m\b/gi, "Range (Meter)")
        .replace(/\bcapacity\s+litre\b/gi, "Capacity (Litre)")
        .replace(/\ben\s*14325\b/gi, "(EN 14325)")
        .replace(/\ben\s*1073\s*2\b/gi, "(EN 1073-2)")
        .replace(/\btype\s*3\s*4\b/gi, "(TYPE3 TYPE4)")
        .replace(/\btype\s*6\b/gi, "(TYPE6)")
        .replace(/\bsec\b/gi, "(Sec)")
        .replace(/\bkg\b/gi, "(KG)")
        .replace(/\bcm\b/gi, "(CM)")
        .replace(/\b°?c\b/gi, "(°C)")
        .replace(/\bmm\b/gi, "(mm)")
        .replace(/\bpsi\b/gi, "(PSI)")
        .replace(/\bbar\b/gi, "(Bar)")
        .replace(/\blpm\b/gi, "(LPM)")
        .replace(/\bgpm\b/gi, "(GPM)")
        .replace(/\bisi\b/gi, "ISI");
    })
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();

  const titleCaseOutsideBrackets = withUnits
    .split(/(\([^)]*\))/g)
    .map((part) => {
      if (part.startsWith("(") && part.endsWith(")")) return part;

      return part.replace(/\b([a-zA-Z])(\w*)\b/g, (_, first, rest) => {
        const word = `${first}${rest}`;
        if (word.toUpperCase() === "ISI") return "ISI";
        return `${first.toUpperCase()}${rest.toLowerCase()}`;
      });
    })
    .join("");

  return toAsciiDoubleQuotes(
    titleCaseOutsideBrackets.replace(/\bIsi\b/g, "ISI"),
  );
};

const formatSpecificationValue = (value) => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    return value
      .map((item) => formatSpecificationValue(item))
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join("; ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([itemKey, itemValue]) => {
        const formattedItemValue = formatSpecificationValue(itemValue);
        const cleanedValue = String(formattedItemValue).trim();
        if (!cleanedValue) return "";
        return `${formatSpecificationKey(itemKey)}: ${cleanedValue}`;
      })
      .filter(Boolean)
      .join(", ");
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") return "Yes";
  if (normalized === "false") return "No";

  return String(value).trim();
};

const formatComplianceFlagKey = (key = "") => {
  const normalizedKey = String(key || "")
    .trim()
    .toLowerCase();
  if (normalizedKey === "ce") return "CE";
  if (normalizedKey === "bis") return "BIS";

  return formatSpecificationKey(key)
    .replace(/\bCe\b/g, "CE")
    .replace(/\bBis\b/g, "BIS");
};

const buildProductSeoDescription = (product = {}) => {
  const explicitDescription = String(product?.description || "").trim();
  if (explicitDescription) {
    return explicitDescription.slice(0, 160);
  }

  const categoryLabel = getCategoryLabelFromSlug(product?.category);
  const certifications = Array.isArray(product?.certification)
    ? product.certification.filter(Boolean).slice(0, 3).join(", ")
    : "";
  const parts = [
    product?.name,
    product?.brand ? `by ${product.brand}` : "",
    categoryLabel ? `${categoryLabel} product` : "industrial safety equipment",
    certifications ? `with ${certifications}` : "",
    "available from ARIHAAN ENTERPRISES across India.",
  ].filter(Boolean);

  return parts.join(" ").slice(0, 160);
};

const buildProductStructuredData = (product = {}) => {
  const canonicalPath = getProductPath(product);
  const imageUrls = Array.isArray(product?.images)
    ? product.images.map((item) => getAssetUrl(item)).filter(Boolean)
    : [];

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product?.name,
    sku: product?.sku || product?._id || product?.id,
    brand: product?.brand
      ? {
          "@type": "Brand",
          name: product.brand,
        }
      : undefined,
    description: buildProductSeoDescription(product),
    category: getCategoryLabelFromSlug(product?.category),
    url: buildAbsoluteUrl(canonicalPath),
    image: imageUrls.length > 0 ? imageUrls : [getDefaultSeoImageUrl()],
  };

  if (product?.hasNumericPrice) {
    productSchema.offers = {
      "@type": "Offer",
      url: buildAbsoluteUrl(canonicalPath),
      priceCurrency: "INR",
      price: Number(product.price || 0),
      availability:
        typeof product?.stock === "number" && product.stock <= 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    };
  }

  return [
    productSchema,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: buildAbsoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Products",
          item: buildAbsoluteUrl("/products"),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: product?.name || "Product",
          item: buildAbsoluteUrl(canonicalPath),
        },
      ],
    },
  ];
};

const renderSpecificationValue = (value, keyPrefix = "spec") => {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    const items = value.filter((item) => isMeaningfulVariantValue(item));
    if (items.length === 0) return "";

    return (
      <ul className="spec-value-list">
        {items.map((item, index) => (
          <li
            key={`${keyPrefix}-item-${index}`}
            className="spec-value-list-item"
          >
            {typeof item === "object"
              ? renderSpecificationValue(item, `${keyPrefix}-nested-${index}`)
              : formatSpecificationValue(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    const isComplianceFlagsContext = /compliance[\s_-]*flags?/i.test(
      String(keyPrefix || ""),
    );

    const entries = Object.entries(value).filter(([, itemValue]) =>
      isMeaningfulVariantValue(itemValue),
    );
    if (entries.length === 0) return "";

    return (
      <ul className="spec-value-kv-list">
        {entries.map(([itemKey, itemValue], index) => (
          <li
            key={`${keyPrefix}-${itemKey}-${index}`}
            className="spec-value-kv-item"
          >
            <span className="spec-value-kv-key">
              {isComplianceFlagsContext
                ? formatComplianceFlagKey(itemKey)
                : formatSpecificationKey(itemKey)}
            </span>
            <span className="spec-value-kv-value">
              {typeof itemValue === "object"
                ? renderSpecificationValue(itemValue, `${keyPrefix}-${itemKey}`)
                : formatSpecificationValue(itemValue)}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <span className="spec-value-text-card">
      {formatSpecificationValue(value)}
    </span>
  );
};

const isToxicTwinFunctionKey = (key = "") => {
  const normalized = String(key)
    .toLowerCase()
    .replace(/[“”„‟«»〝〞＂"']/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.includes("toxic twin function");
};

const sanitizeSpecificationLabel = (label = "") => {
  const text = String(label || "")
    .replace(/[“”„‟«»〝〞＂]/g, '"')
    .trim();
  const normalized = text
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    normalized.includes("toxic") &&
    normalized.includes("twin") &&
    normalized.includes("function")
  ) {
    return '"Toxic twin" function';
  }

  return text;
};

const isMeaningfulVariantValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value))
    return value.some((item) => isMeaningfulVariantValue(item));
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

const getModelVariantEntries = (variant = {}) => {
  if (!variant || typeof variant !== "object") return [];

  const reservedKeys = new Set([
    "label",
    "model",
    "name",
    "size",
    "capacity",
    "color",
    "details",
    "_id",
    "id",
  ]);

  const topLevelEntries = Object.entries(variant).filter(
    ([key, value]) => !reservedKeys.has(key) && isMeaningfulVariantValue(value),
  );

  const detailEntries =
    variant.details && typeof variant.details === "object"
      ? Object.entries(variant.details).filter(([, value]) =>
          isMeaningfulVariantValue(value),
        )
      : [];

  const merged = [...topLevelEntries, ...detailEntries];
  const uniqueEntries = [];
  const seen = new Set();

  merged.forEach(([key, value]) => {
    const normalizedKey = String(key).toLowerCase().trim();
    if (!normalizedKey || seen.has(normalizedKey)) return;
    seen.add(normalizedKey);
    uniqueEntries.push([key, value]);
  });

  return uniqueEntries;
};

const getVariantPrimaryEntries = (variant = {}) => {
  if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
    return [];
  }

  const entries = [];
  const prioritizedKeys = [
    "size",
    "model",
    "name",
    "capacity",
    "color",
    "label",
  ];
  const modelText = String(variant.model || "")
    .trim()
    .toLowerCase();
  const nameText = String(variant.name || "")
    .trim()
    .toLowerCase();
  const sizeText = String(variant.size || "")
    .trim()
    .toLowerCase();

  prioritizedKeys.forEach((key) => {
    const value = variant[key];
    if (!isMeaningfulVariantValue(value)) return;

    if (key === "label") {
      const labelText = String(value || "").trim();
      const normalizedLabel = labelText.toLowerCase();
      if (!labelText || isGenericVariantLabel(labelText)) return;
      if (
        normalizedLabel &&
        [modelText, nameText, sizeText].some(
          (candidate) => candidate && candidate === normalizedLabel,
        )
      ) {
        return;
      }
    }

    entries.push([key, value]);
  });

  return entries;
};

const getNormalizedVariantEntryKey = (key = "") =>
  String(key || "")
    .toLowerCase()
    .trim();

const getNormalizedVariantOptionToken = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const isModelCodeLikeKey = (value = "") => {
  const normalized = getNormalizedVariantOptionToken(
    String(value || "").replace(/[_-]+/g, " "),
  );

  if (!normalized) return false;

  return /(^|\s)(model|sku|series|part|item\s*code|product\s*code|code)(\s|$)/i.test(
    normalized,
  );
};

const isLikelyModelOptionKey = (value = "") =>
  /^option\s*\d+$/i.test(getNormalizedVariantOptionToken(value));

const isMeasurementStyleKey = (value = "") => {
  const normalized = getNormalizedVariantOptionToken(
    String(value || "").replace(/[_-]+/g, " "),
  );

  if (!normalized) return false;

  return /(^|\s)(capacity|size|weight|length|width|height|diameter|color|price|qty|quantity|rating|standard|certification|feature|application|material)(\s|$)/i.test(
    normalized,
  );
};

const isSizeLikeVariantValue = (value = "") => {
  const normalized = getNormalizedVariantOptionToken(value);
  if (!normalized) return false;

  return (
    /^size\s*[-:]*\s*[0-9]{1,2}(?:\.[0-9])?$/.test(normalized) ||
    /^uk\s*[0-9]{1,2}(?:\.[0-9])?$/.test(normalized) ||
    /^eu\s*[0-9]{2}(?:\.[0-9])?$/.test(normalized) ||
    /^us\s*[0-9]{1,2}(?:\.[0-9])?$/.test(normalized) ||
    /^[0-9]{1,2}(?:\.[0-9])?$/.test(normalized)
  );
};

const getUniqueVariantEntries = (variant = {}) => {
  if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
    return [];
  }

  const mergedEntries = [
    ...getVariantPrimaryEntries(variant),
    ...getModelVariantEntries(variant),
  ];
  const uniqueEntries = [];
  const seen = new Set();

  mergedEntries.forEach(([key, value]) => {
    const normalizedKey = getNormalizedVariantEntryKey(key);
    if (!normalizedKey || seen.has(normalizedKey)) return;
    if (!isMeaningfulVariantValue(value)) return;

    seen.add(normalizedKey);
    uniqueEntries.push([key, value]);
  });

  return uniqueEntries;
};

const deriveModelVariantLabelFromEntries = (variant = {}) => {
  const entries = getModelVariantEntries(variant);
  if (entries.length === 0) return "";

  const candidates = entries
    .map(([key, value]) => {
      const keyText = String(key || "").trim();
      const label = formatSpecificationValue(value).trim();

      if (!keyText || !label) return null;
      if (isGenericVariantLabel(label)) return null;

      let score = 0;

      if (isModelCodeLikeKey(keyText)) score += 6;
      if (isLikelyModelOptionKey(keyText)) score += 4;
      if (isMeasurementStyleKey(keyText)) score -= 3;
      if (label.length <= 40) score += 2;
      if (label.length > 80) score -= 3;

      return { label, score };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.score - left.score || left.label.length - right.label.length,
    );

  if (candidates.length === 0) return "";

  if (candidates[0].score < 2) {
    return candidates.length === 1 && candidates[0].label.length <= 40
      ? candidates[0].label
      : "";
  }

  return candidates[0].label;
};

const getModelVariantOption = (variant = {}, index = 0) => {
  const size = String(variant?.size || "").trim();
  const model = String(variant?.model || "").trim();
  const name = String(variant?.name || "").trim();
  const label = String(variant?.label || "").trim();
  const capacity = formatSpecificationValue(variant?.capacity).trim();
  const color = String(variant?.color || "").trim();
  const nonGenericModel = model && !isGenericVariantLabel(model) ? model : "";
  const nonGenericName = name && !isGenericVariantLabel(name) ? name : "";
  const nonGenericLabel = label && !isGenericVariantLabel(label) ? label : "";
  const detailLabel = deriveModelVariantLabelFromEntries(variant);
  const derivedSize =
    size ||
    (isSizeLikeVariantValue(nonGenericModel)
      ? nonGenericModel
      : isSizeLikeVariantValue(nonGenericLabel)
        ? nonGenericLabel
        : isSizeLikeVariantValue(nonGenericName)
          ? nonGenericName
          : "");
  const optionLabel =
    derivedSize ||
    nonGenericModel ||
    nonGenericName ||
    nonGenericLabel ||
    detailLabel ||
    capacity ||
    color ||
    `Option ${index + 1}`;
  const optionKind = derivedSize
    ? "size"
    : nonGenericModel
      ? "model"
      : nonGenericName
        ? "name"
        : nonGenericLabel
          ? "label"
          : detailLabel
            ? "detail"
            : capacity
              ? "capacity"
              : color
                ? "color"
                : "option";

  return {
    id: String(index),
    variantIndex: index,
    label: optionLabel,
    kind: optionKind,
  };
};

const buildSizeVariantOptions = (variants = [], displaySizes = []) => {
  if (!Array.isArray(variants) || variants.length === 0) {
    return [];
  }

  const sourceSizes = Array.isArray(displaySizes) ? displaySizes : [];
  const options = [];
  const seen = new Set();

  sourceSizes.forEach((sizeValue) => {
    const label = String(sizeValue || "").trim();
    const token = getNormalizedVariantOptionToken(label);
    if (!token || seen.has(token)) return;

    const variantIndex = variants.findIndex(
      (variant) =>
        getNormalizedVariantOptionToken(
          formatSpecificationValue(
            variant?.size ||
              variant?.label ||
              variant?.model ||
              variant?.name ||
              "",
          ),
        ) === token,
    );

    if (variantIndex < 0) return;

    seen.add(token);
    options.push({
      id: token,
      variantIndex,
      label,
      kind: "size",
    });
  });

  return options;
};

const summarizeModelVariants = (variants = []) => {
  if (!Array.isArray(variants) || variants.length === 0) {
    return { rows: [], sharedRows: [], differentRows: [] };
  }

  const validVariants = variants.filter(
    (variant) =>
      variant && typeof variant === "object" && !Array.isArray(variant),
  );

  if (validVariants.length === 0) {
    return { rows: [], sharedRows: [], differentRows: [] };
  }

  const keyPriority = new Map([
    ["size", 0],
    ["model", 1],
    ["name", 2],
    ["capacity", 3],
    ["color", 4],
    ["label", 5],
  ]);

  const summaryMap = new Map();

  validVariants.forEach((variant) => {
    const seenKeysForVariant = new Set();
    const entries = [
      ...getVariantPrimaryEntries(variant),
      ...getModelVariantEntries(variant),
    ];

    entries.forEach(([key, rawValue]) => {
      const normalizedKey = String(key || "")
        .toLowerCase()
        .trim();
      if (!normalizedKey || seenKeysForVariant.has(normalizedKey)) return;

      const displayValue = formatSpecificationValue(rawValue).trim();
      if (!displayValue) return;

      seenKeysForVariant.add(normalizedKey);

      if (!summaryMap.has(normalizedKey)) {
        summaryMap.set(normalizedKey, {
          key,
          normalizedKey,
          values: new Map(),
          occurrences: 0,
          order: summaryMap.size,
          priority: keyPriority.has(normalizedKey)
            ? keyPriority.get(normalizedKey)
            : 100,
        });
      }

      const entry = summaryMap.get(normalizedKey);
      entry.occurrences += 1;

      const valueToken = displayValue.toLowerCase();
      if (!entry.values.has(valueToken)) {
        entry.values.set(valueToken, displayValue);
      }
    });
  });

  const rows = Array.from(summaryMap.values())
    .map((entry) => ({
      key: entry.key,
      normalizedKey: entry.normalizedKey,
      values: Array.from(entry.values.values()),
      occurrences: entry.occurrences,
      isCommon:
        entry.occurrences === validVariants.length && entry.values.size === 1,
      priority: entry.priority,
      order: entry.order,
    }))
    .sort((a, b) => a.priority - b.priority || a.order - b.order);

  return {
    rows,
    sharedRows: rows.filter((row) => row.isCommon),
    differentRows: rows.filter((row) => !row.isCommon),
  };
};

const isModelStyleVariant = (variant = {}) => {
  if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
    return false;
  }

  if (
    variant.details &&
    typeof variant.details === "object" &&
    Object.keys(variant.details).length > 0
  ) {
    return true;
  }

  if (
    isMeaningfulVariantValue(variant.model) ||
    isMeaningfulVariantValue(variant.name)
  ) {
    return true;
  }

  const basicKeys = new Set([
    "label",
    "size",
    "capacity",
    "color",
    "_id",
    "id",
  ]);

  return Object.entries(variant).some(
    ([key, value]) => !basicKeys.has(key) && isMeaningfulVariantValue(value),
  );
};

const isSeriesKey = (key = "") => /^model(?:_.*)?_series$/i.test(String(key));

const isUd30OverspectaclesProduct = (product = {}) => {
  const normalizedName = String(product?.name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return normalizedName.includes("udyogi ud30 overspectacles");
};

const normalizeProductNameForMatch = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isGumbootProduct = (product = {}) => {
  const normalizedName = normalizeProductNameForMatch(product?.name);

  return /\bgum\s*boots?\b/i.test(normalizedName);
};

const isJsPhoenixBuffaloBartonSafetyShoeProduct = (product = {}) => {
  const normalizedName = normalizeProductNameForMatch(product?.name);

  return normalizedName.includes(
    "js phoenix buffalo barton print black s3 safety shoes",
  );
};

const isCeramicWeldingBlanketVermiculiteProduct = (product = {}) => {
  const normalizedName = normalizeProductNameForMatch(product?.name);

  return normalizedName.includes(
    "ceramic welding blanket with vermiculite coating",
  );
};

const isThicknessEntryKey = (key = "") =>
  normalizeProductNameForMatch(key).includes("thickness");

const getAvailableVariantSizes = (product = {}) => {
  const sizesFromVariants = Array.isArray(product?.variants)
    ? product.variants
        .map((variant) => String(variant?.size || "").trim())
        .filter(Boolean)
    : [];

  const fallbackSizes = Array.isArray(product?.variantSizes)
    ? product.variantSizes
        .map((variantSize) => String(variantSize || "").trim())
        .filter(Boolean)
    : [];

  const sourceSizes =
    sizesFromVariants.length > 0 ? sizesFromVariants : fallbackSizes;
  return [...new Set(sourceSizes)];
};

const isGenericVariantLabel = (value = "") =>
  /^(variant|option)\s*[-_]*\d+$/i.test(String(value || "").trim());

const extractSeriesEntries = (variants = []) => {
  if (!Array.isArray(variants)) return [];

  const entries = [];
  variants.forEach((variant, variantIndex) => {
    if (!variant || typeof variant !== "object") return;

    Object.entries(variant).forEach(([key, value]) => {
      const seriesValue = String(value || "").trim();
      if (!isSeriesKey(key) || !seriesValue) return;

      const powderType = String(
        variant.powder_type || variant?.details?.powder_type || "",
      ).trim();

      entries.push({
        id: `${variantIndex}-${key}-${seriesValue}`,
        variantIndex,
        seriesKey: key,
        seriesValue,
        powderType,
      });
    });
  });

  return entries;
};

const getEntriesForSelectedSeries = (variant = {}, selectedSeries = null) => {
  if (!variant || typeof variant !== "object") return [];

  const selectedSeriesPair = selectedSeries
    ? [["model_series", selectedSeries.seriesValue]]
    : [];

  const topLevelEntries = Object.entries(variant).filter(([key, value]) => {
    if (key === "details" || key === "_id" || key === "id") return false;
    if (key === "label" || isSeriesKey(key)) return false;
    return isMeaningfulVariantValue(value);
  });

  const detailEntries =
    variant.details && typeof variant.details === "object"
      ? Object.entries(variant.details).filter(
          ([key, value]) =>
            !isSeriesKey(key) && isMeaningfulVariantValue(value),
        )
      : [];

  const merged = [...selectedSeriesPair, ...topLevelEntries, ...detailEntries];
  const uniqueEntries = [];
  const seen = new Set();

  merged.forEach(([key, value]) => {
    const token = String(key).toLowerCase().trim();
    if (!token || seen.has(token)) return;
    seen.add(token);
    uniqueEntries.push([key, value]);
  });

  return uniqueEntries;
};

const toCapacityLabel = (capacity = {}) => {
  if (!capacity || typeof capacity !== "object") return "";

  if (capacity.capacity_kg !== undefined && capacity.capacity_kg !== null) {
    return `${capacity.capacity_kg} KG`;
  }

  if (
    capacity.capacity_litre !== undefined &&
    capacity.capacity_litre !== null
  ) {
    return `${capacity.capacity_litre} Litre`;
  }

  if (capacity.capacity !== undefined && capacity.capacity !== null) {
    return String(capacity.capacity).trim();
  }

  return "";
};

const extractCapacityOptions = (variant = {}) => {
  if (!variant || typeof variant !== "object") return [];

  const sourceCapacities = Array.isArray(variant.capacities)
    ? variant.capacities
    : Array.isArray(variant?.details?.capacities)
      ? variant.details.capacities
      : [];

  return sourceCapacities
    .map((capacity, index) => {
      const capacityLabel = toCapacityLabel(capacity);
      const fireRating = String(capacity?.fire_rating || "").trim();

      return {
        id: `${index}-${capacityLabel || "capacity"}`,
        index,
        capacity,
        capacityLabel: capacityLabel || `Option ${index + 1}`,
        fireRating,
      };
    })
    .filter((item) => item.capacity && typeof item.capacity === "object");
};

const getEntriesForSelectedCapacity = (
  capacity = {},
  selectedSeries = null,
) => {
  if (!capacity || typeof capacity !== "object") return [];

  const baseSeriesEntries = selectedSeries
    ? [
        ["model_series", selectedSeries.seriesValue],
        ...(selectedSeries?.powderType
          ? [["powder_type", selectedSeries.powderType]]
          : []),
      ]
    : [];

  const capacityEntries = Object.entries(capacity).filter(([, value]) =>
    isMeaningfulVariantValue(value),
  );

  const merged = [...baseSeriesEntries, ...capacityEntries];
  const uniqueEntries = [];
  const seen = new Set();

  merged.forEach(([key, value]) => {
    const token = String(key).toLowerCase().trim();
    if (!token || seen.has(token)) return;
    seen.add(token);
    uniqueEntries.push([key, value]);
  });

  return uniqueEntries;
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [selectedCapacityId, setSelectedCapacityId] = useState("");
  const [selectedModelVariantId, setSelectedModelVariantId] = useState("");

  const fetchRelatedProducts = useCallback(
    async (category, currentProductId) => {
      try {
        const response = await fetch(
          `${API_URL}/products?category=${category}`,
        );
        const data = await response.json();

        let related = [];
        const normalizedByCategory =
          extractProductsFromResponse(data).map(normalizeProduct);
        if (data.success || normalizedByCategory.length > 0) {
          related = normalizedByCategory.filter(
            (p) => (p._id || p.id) !== currentProductId && p.isActive,
          );
        }

        if (related.length < 4) {
          try {
            const allResp = await fetch(`${API_URL}/products`);
            const allData = await allResp.json();
            const normalizedAll =
              extractProductsFromResponse(allData).map(normalizeProduct);

            if (allData.success || normalizedAll.length > 0) {
              const extra = normalizedAll
                .filter(
                  (p) =>
                    p.isActive &&
                    (p._id || p.id) !== currentProductId &&
                    !related.some((r) => (r._id || r.id) === (p._id || p.id)),
                )
                .slice(0, 4 - related.length);
              related = related.concat(extra);
            }
          } catch (err) {
            console.error("Error fetching fallback products:", err);
          }
        }

        related = related.map((r) => ({
          ...r,
          icon: getCategoryIcon(r.category),
        }));
        setRelatedProducts(related.slice(0, 4));
      } catch (error) {
        console.error("Error loading related products:", error);
      }
    },
    [],
  );

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/products/${encodeURIComponent(id)}`,
      );
      const data = await response.json();
      const rawProduct = extractSingleProductFromResponse(data);

      if ((data.success || rawProduct) && rawProduct) {
        const normalizedProduct = normalizeProduct(rawProduct);
        const canonicalPath = getProductPath(normalizedProduct);
        setProduct(normalizedProduct);
        setSelectedSeriesId("");
        setSelectedCapacityId("");
        setSelectedModelVariantId("");
        const currentProductId = normalizedProduct._id || normalizedProduct.id;

        if (canonicalPath && location.pathname !== canonicalPath) {
          navigate(canonicalPath, {
            replace: true,
            state: location.state,
          });
        }

        fetchRelatedProducts(normalizedProduct.category, currentProductId);
      } else {
        setError("Product not found");
        console.error("Product not found for ID:", id);
      }
    } catch (error) {
      console.error("Error loading product:", error);
      setError("Failed to load product details");
    } finally {
      setLoading(false);
    }
  }, [fetchRelatedProducts, id, location.pathname, location.state, navigate]);

  useEffect(() => {
    fetchProduct();
    // Check if user is admin
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (userStr && token) {
      try {
        const user = JSON.parse(userStr);
        // Check multiple possible role field names
        const isAdminUser =
          user.role === "admin" ||
          user.isAdmin === true ||
          user.roleId === "admin";
        setIsAdmin(isAdminUser);
      } catch (e) {
        console.error("Error parsing user from localStorage:", e);
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }

    // Ensure navbar is always visible on this page
    const navbar = document.querySelector(".navbar");
    if (navbar) {
      navbar.classList.remove("hidden");
    }

    // Cleanup: Keep navbar visible when leaving this page
    return () => {
      const navbar = document.querySelector(".navbar");
      if (navbar) {
        navbar.classList.remove("hidden");
      }
    };
  }, [fetchProduct]);

  const handleShareWhatsApp = () => {
    if (!product) return;

    const productUrl = buildAbsoluteUrl(getProductPath(product));
    const message = `Check out this product: *${product.name}* 🛡️\n\nBrand: ${product.brand || "N/A"}\nPrice: ₹${Number(product.price || 0).toLocaleString("en-IN")} + GST\n\nView Details: ${productUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleCallUs = () => {
    window.location.href = "tel:+919227053200";
  };

  useEffect(() => {
    const fromLocation = location.state?.from;
    const sourceProductId = String(
      location.state?.sourceProductId || "",
    ).trim();

    if (!fromLocation || fromLocation.pathname !== "/products") {
      return;
    }

    if (!sourceProductId) {
      return;
    }

    try {
      sessionStorage.setItem(
        PRODUCTS_PENDING_RESTORE_KEY,
        JSON.stringify({ productId: sourceProductId }),
      );
    } catch (error) {
      // ignore storage errors
    }
  }, [location.state]);

  const handleBack = () => {
    const fromLocation = location.state?.from;
    const sourceProductId = String(
      location.state?.sourceProductId || "",
    ).trim();

    if (fromLocation && typeof fromLocation === "object") {
      if (fromLocation.pathname === "/products") {
        const restoreState = sourceProductId
          ? {
              restoreScrollTarget: "products-product-card",
              restoreProductId: sourceProductId,
            }
          : {
              restoreScrollTarget: "products-pagination-top",
            };

        navigate(
          {
            pathname: fromLocation.pathname,
            search: fromLocation.search || "",
          },
          {
            replace: true,
            state: restoreState,
          },
        );
        return;
      }

      navigate(fromLocation, { replace: true });
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/products");
  };

  const handleUploadSuccess = (uploadResult) => {
    if (uploadResult.type === "images" && uploadResult.files) {
      const newImages = uploadResult.files.map((f) => f.url);
      setProduct((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...newImages],
      }));
    } else if (uploadResult.type === "datasheet" && uploadResult.file) {
      setProduct((prev) => ({
        ...prev,
        datasheet: uploadResult.file.url,
      }));
    }
  };

  const handleSchemaProductUpdated = useCallback(
    (updatedProduct) => {
      if (!updatedProduct) {
        fetchProduct();
        return;
      }

      const normalized = normalizeProduct(updatedProduct);
      setProduct(normalized);
      setSelectedModelVariantId("");

      const currentProductId = normalized._id || normalized.id || id;
      if (normalized.category) {
        fetchRelatedProducts(normalized.category, currentProductId);
      }
    },
    [fetchProduct, fetchRelatedProducts, id],
  );

  if (loading) {
    return (
      <div className="product-detail-page">
        <SeoHead
          title="Product Details | ARIHAAN ENTERPRISES"
          description="Browse industrial safety product details from ARIHAAN ENTERPRISES."
          canonicalPath={`/products/${encodeURIComponent(id)}`}
        />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2>Loading product details...</h2>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <SeoHead
          title="Product Not Found | ARIHAAN ENTERPRISES"
          description="The requested product page could not be found. Browse more industrial safety equipment from ARIHAAN ENTERPRISES."
          canonicalPath="/products"
          noIndex
        />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2>❌ {error || "Product not found"}</h2>
          <Link
            to="/products"
            style={{ color: "var(--primary-orange)", fontSize: "16px" }}
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const forceAvailableSizeVariantView = isGumbootProduct(product);
  const displayVariantSizes = forceAvailableSizeVariantView
    ? getAvailableVariantSizes(product)
    : product.variantSizes || [];

  const useModelVariantView =
    !forceAvailableSizeVariantView &&
    Array.isArray(product.variants) &&
    product.variants.some((variant) => isModelStyleVariant(variant));
  const showThicknessOnlyVariantDetails =
    isCeramicWeldingBlanketVermiculiteProduct(product);
  const forceSizeVariantSelector =
    isJsPhoenixBuffaloBartonSafetyShoeProduct(product);
  const hideGenericVariantTitleText =
    isUd30OverspectaclesProduct(product) || showThicknessOnlyVariantDetails;

  const seriesEntries = extractSeriesEntries(product.variants || []);
  const useSeriesSelector =
    !forceAvailableSizeVariantView && seriesEntries.length > 0;
  const rawModelVariantOptions =
    useModelVariantView && !useSeriesSelector && Array.isArray(product.variants)
      ? product.variants.map((variant, index) =>
          getModelVariantOption(variant, index),
        )
      : [];
  const useSizeVariantSelector =
    forceSizeVariantSelector ||
    (rawModelVariantOptions.length > 0 &&
      rawModelVariantOptions.every((option) => option.kind === "size"));
  const sizeVariantOptions = useSizeVariantSelector
    ? buildSizeVariantOptions(product.variants || [], displayVariantSizes)
    : [];
  const modelVariantOptions =
    useSizeVariantSelector && sizeVariantOptions.length > 0
      ? sizeVariantOptions
      : rawModelVariantOptions;
  const hasMultipleModelVariantOptions = modelVariantOptions.length > 1;
  const visibleDisplayVariantSizes = displayVariantSizes.filter(
    (size) => !(hideGenericVariantTitleText && isGenericVariantLabel(size)),
  );
  const selectedModelVariantOption =
    modelVariantOptions.find(
      (option) => option.id === selectedModelVariantId,
    ) ||
    modelVariantOptions[0] ||
    null;
  const selectedModelVariant = selectedModelVariantOption
    ? product.variants?.[selectedModelVariantOption.variantIndex] || null
    : null;
  const shouldShowVariantControls =
    useSeriesSelector ||
    (useModelVariantView
      ? hasMultipleModelVariantOptions
      : visibleDisplayVariantSizes.length > 0);

  const selectedSeries =
    seriesEntries.find((entry) => entry.id === selectedSeriesId) ||
    seriesEntries[0] ||
    null;

  const selectedSeriesVariant =
    selectedSeries && Array.isArray(product.variants)
      ? product.variants[selectedSeries.variantIndex]
      : null;

  const capacityOptions = extractCapacityOptions(selectedSeriesVariant);
  const selectedCapacity =
    capacityOptions.find((item) => item.id === selectedCapacityId) ||
    capacityOptions[0] ||
    null;

  const selectedCapacityDetails = getEntriesForSelectedCapacity(
    selectedCapacity?.capacity,
    selectedSeries,
  );

  const selectedSeriesDetails = getEntriesForSelectedSeries(
    selectedSeriesVariant,
    selectedSeries,
  );

  const selectedVariantDetailsForSpecs = useSeriesSelector
    ? capacityOptions.length > 0
      ? selectedCapacityDetails
      : selectedSeriesDetails
    : [];

  const baseSpecifications = product.specifications || {};
  const modelVariantSummary = useModelVariantView
    ? summarizeModelVariants(product.variants || [])
    : { rows: [], sharedRows: [], differentRows: [] };
  const visibleVariantSummaryRows = showThicknessOnlyVariantDetails
    ? modelVariantSummary.rows.filter((row) => isThicknessEntryKey(row.key))
    : modelVariantSummary.rows;
  const sharedModelVariantEntries = visibleVariantSummaryRows
    .filter((row) => row.isCommon)
    .map((row) => [row.key, row.values[0]]);
  const sharedModelVariantKeySet = new Set(
    sharedModelVariantEntries.map(([key]) => getNormalizedVariantEntryKey(key)),
  );
  const selectedModelVariantEntries = selectedModelVariant
    ? getUniqueVariantEntries(selectedModelVariant).filter(([key]) => {
        if (showThicknessOnlyVariantDetails && !isThicknessEntryKey(key)) {
          return false;
        }

        return !sharedModelVariantKeySet.has(getNormalizedVariantEntryKey(key));
      })
    : [];
  const variantSpecificationEntries = useSeriesSelector
    ? selectedVariantDetailsForSpecs
    : useModelVariantView && !useSeriesSelector
      ? [...sharedModelVariantEntries, ...selectedModelVariantEntries]
      : [];
  const variantSpecificationKeySet = new Set(
    variantSpecificationEntries.map(([key]) =>
      getNormalizedVariantEntryKey(key),
    ),
  );

  const specificationEntries =
    variantSpecificationEntries.length > 0
      ? [
          ...variantSpecificationEntries,
          ...Object.entries(baseSpecifications).filter(
            ([key]) =>
              !variantSpecificationKeySet.has(
                getNormalizedVariantEntryKey(key),
              ),
          ),
        ]
      : Object.entries(baseSpecifications);

  return (
    <div className="product-detail-page">
      <SeoHead
        title={`${product.name} | ${product.brand || "Safety Product"} | ARIHAAN ENTERPRISES`}
        description={buildProductSeoDescription(product)}
        canonicalPath={getProductPath(product)}
        image={product.images?.[0] ? getAssetUrl(product.images[0]) : undefined}
        type="product"
        structuredData={buildProductStructuredData(product)}
      />

      <div className="detail-top-actions">
        <button type="button" className="detail-back-btn" onClick={handleBack}>
          ← Back
        </button>
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Home</Link> /<Link to="/products">Products</Link> /
          <span>{product.name}</span>
        </div>
      </div>

      {/* Product Detail Section */}
      <section className="product-detail">
        <ProductGallery product={product} />

        <div className="product-details">
          <div className="product-meta">
            {product.brand && (
              <span className="meta-badge brand">{product.brand}</span>
            )}
            <span className="meta-badge category">
              {product.category?.replace("-", " ") || "Product"}
            </span>
            {product.type && (
              <span className="meta-badge category">Type: {product.type}</span>
            )}
            {product.hsn && (
              <span className="meta-badge hsn">HSN: {product.hsn}</span>
            )}
            {typeof product.gstRate === "number" && (
              <span className="meta-badge hsn">GST: {product.gstRate}%</span>
            )}
            {typeof product.stock === "number" && (
              <span
                className={`meta-badge stock ${product.stock < 50 ? "low" : ""}`}
              >
                {product.stock} in stock
              </span>
            )}
          </div>

          <h1>{product.name}</h1>

          <div className="product-price-section">
            <div
              className={`price ${!product.hasNumericPrice ? "price-on-request" : ""}`}
            >
              {product.hasNumericPrice
                ? `₹${Number(product.price || 0).toLocaleString("en-IN")}`
                : stripGstFromLabel(product.priceLabel || "Price on Request") ||
                  "Price on Request"}
            </div>
          </div>

          <p className="product-description">{product.description}</p>

          {shouldShowVariantControls && (
            <div className="certifications">
              <h3>
                {useSeriesSelector
                  ? "AVAILABLE MODELS"
                  : useModelVariantView
                    ? useSizeVariantSelector
                      ? "Available Sizes"
                      : "AVAILABLE MODELS"
                    : "Available Sizes"}
              </h3>
              {useSeriesSelector ? (
                <div className="model-series-wrapper">
                  <div className="model-series-list model-series-list--series">
                    {seriesEntries.map((entry) => (
                      <button
                        type="button"
                        key={entry.id}
                        className={`model-series-chip model-series-chip--series ${selectedSeries?.id === entry.id ? "active" : ""}`}
                        onClick={() => {
                          setSelectedSeriesId(entry.id);
                          setSelectedCapacityId("");
                        }}
                      >
                        <span className="model-series-main">
                          {entry.seriesValue}
                        </span>
                        {entry.powderType && (
                          <span className="model-series-powder">
                            {String(entry.powderType).replace(/\s+/g, "\u00A0")}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedSeries && capacityOptions.length > 0 && (
                    <>
                      <div className="model-series-list model-series-list--capacity">
                        {capacityOptions.map((option) => (
                          <button
                            type="button"
                            key={option.id}
                            className={`model-series-chip model-series-chip--capacity ${selectedCapacity?.id === option.id ? "active" : ""}`}
                            onClick={() => setSelectedCapacityId(option.id)}
                          >
                            {option.capacityLabel}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : useModelVariantView && hasMultipleModelVariantOptions ? (
                <div className="model-series-wrapper">
                  {useSizeVariantSelector ? (
                    <div className="cert-badges">
                      {modelVariantOptions.map((option) => (
                        <button
                          type="button"
                          key={option.id}
                          className={`cert-badge variant-size-badge ${selectedModelVariantOption?.id === option.id ? "active" : ""}`}
                          onClick={() => setSelectedModelVariantId(option.id)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="model-series-list model-series-list--capacity">
                      {modelVariantOptions.map((option) => (
                        <button
                          type="button"
                          key={option.id}
                          className={`model-series-chip model-series-chip--capacity ${selectedModelVariantOption?.id === option.id ? "active" : ""}`}
                          onClick={() => setSelectedModelVariantId(option.id)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="cert-badges">
                  {visibleDisplayVariantSizes.map((size, idx) => (
                    <span key={idx} className="cert-badge">
                      {size}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {product.certification && product.certification.length > 0 && (
            <div className="certifications">
              <h3>Certifications</h3>
              <div className="cert-badges">
                {product.certification.map((cert, idx) => (
                  <span key={idx} className="cert-badge">
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          )}

          {specificationEntries.length > 0 && (
            <div className="specifications">
              <h3>Specifications</h3>
              <div className="spec-table">
                {specificationEntries.map(([key, value]) => {
                  const isToxicTwin = isToxicTwinFunctionKey(key);
                  const labelText = isToxicTwin
                    ? "Toxic twin function"
                    : sanitizeSpecificationLabel(formatSpecificationKey(key));

                  return (
                    <div key={key} className="spec-row">
                      <div className="spec-label">{labelText}</div>
                      <div className="spec-value">
                        {renderSpecificationValue(value, `spec-${key}`)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="product-actions">
            <Link to="/contact" className="btn-enquiry-primary">
              📧 Send Enquiry
            </Link>
            <button className="btn-call" onClick={handleCallUs}>
              📞 Call Us
            </button>
            <button className="btn-whatsapp" onClick={handleShareWhatsApp}>
              💬 Share on WhatsApp
            </button>
          </div>
        </div>
      </section>

      {/* Admin Panel - Upload Media */}
      {isAdmin && (
        <section className="admin-section">
          <div className="admin-header">
            <h2>🔧 Admin Panel</h2>
            <button
              className="toggle-upload-btn"
              onClick={() => setShowUploadForm(!showUploadForm)}
            >
              {showUploadForm ? "✕ Close" : "📤 Upload Media"}
            </button>
          </div>

          {showUploadForm && (
            <ProductUpload
              productId={id}
              onUploadSuccess={handleUploadSuccess}
            />
          )}

          <ProductSchemaAssistant
            productId={id}
            product={product}
            onProductUpdated={handleSchemaProductUpdated}
          />
        </section>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="related-products">
          <h2>Related Products</h2>
          <div className="related-grid">
            {relatedProducts.map((item) => (
              <Link
                key={item._id || item.id}
                to={getProductPath(item)}
                state={{
                  from: {
                    pathname: location.pathname,
                    search: location.search,
                  },
                }}
                className="related-card"
              >
                <div className="related-image">
                  {item.images && item.images.length > 0 ? (
                    <img
                      src={getAssetUrl(item.images[0])}
                      alt={item.name}
                      className="related-img"
                    />
                  ) : (
                    <div className="related-icon-fallback">
                      {item.icon || getCategoryIcon(item.category)}
                    </div>
                  )}
                  {item.brand && (
                    <span className="related-brand-badge">{item.brand}</span>
                  )}
                </div>
                <h4>{item.name}</h4>
                <p>
                  {item.hasNumericPrice
                    ? `₹${Number(item.price || 0).toLocaleString("en-IN")}`
                    : `${item.priceLabel || "Price on Request"} + ${
                        typeof item.gstRate === "number"
                          ? `${item.gstRate}% GST`
                          : "GST"
                      }`}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
