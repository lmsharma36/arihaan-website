const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Product = require("../models/Product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const upload = require("../middleware/upload");
const productDraftService = require("../services/productDraftService");

const REQUIRED_PRODUCT_FIELDS = ["sku", "name", "slug", "brand", "category"];

const ALLOWED_CATEGORY_SLUGS = new Set([
  "fall-protection",
  "hand-protection",
  "foot-protection",
  "head-protection",
  "eye-face-protection",
  "hearing-protection",
  "respiratory-protection",
  "body-protection",
]);

const CATEGORY_ALIASES = {
  "fall protection": "fall-protection",
  "hand protection": "hand-protection",
  "hand arm protection": "hand-protection",
  "hand and arm protection": "hand-protection",
  "foot protection": "foot-protection",
  "safety footwear": "foot-protection",
  "head protection": "head-protection",
  "head hearing protection": "head-protection",
  "head and hearing protection": "head-protection",
  "eye protection": "eye-face-protection",
  "eye face protection": "eye-face-protection",
  "eye and face protection": "eye-face-protection",
  "face protection": "eye-face-protection",
  "hearing protection": "hearing-protection",
  "respiratory protection": "respiratory-protection",
  "body protection": "body-protection",
  "protective clothing": "body-protection",
  "head-hearing-protection": "head-protection",
  "hand-arm-protection": "hand-protection",
  "safety-footwear": "foot-protection",
  "protective-clothing": "body-protection",
};

const CATEGORY_KEYWORDS = [
  {
    slug: "head-protection",
    keywords: ["helmet", "hard hat", "cap", "hood"],
  },
  {
    slug: "hand-protection",
    keywords: ["glove", "gloves", "hand protection", "mittens"],
  },
  {
    slug: "foot-protection",
    keywords: ["shoe", "boot", "footwear", "gumboot", "safety shoe"],
  },
  {
    slug: "eye-face-protection",
    keywords: ["goggle", "face shield", "spectacle", "visor", "safety glass"],
  },
  {
    slug: "hearing-protection",
    keywords: ["earmuff", "earplug", "ear plug", "hearing protection"],
  },
  {
    slug: "respiratory-protection",
    keywords: ["respirator", "mask", "cartridge", "n95", "breathing"],
  },
  {
    slug: "fall-protection",
    keywords: [
      "fall arrest",
      "lanyard",
      "harness",
      "lifeline",
      "karabiner",
      "anchor",
      "safety belt",
    ],
  },
  {
    slug: "body-protection",
    keywords: ["coverall", "apron", "protective clothing", "suit", "vest"],
  },
];

const CONTACT_KEY_PATTERN =
  /\b(tel|telephone|phone|mobile|email|e-mail|website|web|address|street|road|avenue|floor|fax|whatsapp|contact)\b/i;
const CONTACT_VALUE_PATTERN =
  /(@|www\.|https?:\/\/|\b(?:tel|telephone|phone|mobile|email|e-mail|website|whatsapp)\b|\+?\d[\d\s()/-]{7,})/i;
const FEATURE_KEY_PHRASES = new Set([
  "feature",
  "application",
  "applications",
  "use",
  "uses",
  "ladder climbing",
  "rope access",
  "inspection",
  "protection from falls",
  "reduce the risk of injuries",
  "energy absorber",
]);
const CERTIFICATION_PATTERNS = [
  /\bEN\s*\d+(?::\d{2,4})?\b/gi,
  /\bIS\s*\d+(?:\s*\(Part\s*\d+\))?(?::\d{2,4})?\b/gi,
  /\bISO\s*\d+(?::\d{2,4})?\b/gi,
  /\bCE\b/gi,
  /\bISI\b/gi,
];

const toSlug = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/["'`]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);

const PRODUCT_TYPE_KEYWORDS = new Set([
  "lanyard",
  "rope",
  "harness",
  "gloves",
  "shoes",
  "helmet",
  "goggles",
  "respirator",
  "mask",
  "earmuff",
  "earplug",
  "vest",
  "jacket",
  "apron",
  "knee",
  "pad",
  "sleeve",
  "strap",
  "belt",
  "net",
  "safety",
  "protective",
]);

const MATERIAL_KEYWORDS = new Set([
  "polyester",
  "polyamide",
  "nylon",
  "steel",
  "leather",
  "rubber",
  "cotton",
  "canvas",
  "foam",
  "mesh",
  "plastic",
  "vinyl",
  "kevlar",
  "aramid",
]);

const normalizeToken = (value = "") =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();

const isModelToken = (value = "") => {
  const raw = String(value || "").trim();
  const token = raw.replace(/[^a-zA-Z0-9]+/g, "");
  if (!token) return false;

  // Common model token patterns: RL, 22, X7, A12B, 3M, MK2
  return (
    /\d/.test(token) ||
    /^[A-Z]{1,4}$/.test(raw) ||
    /^[A-Za-z]{1,2}$/.test(token)
  );
};

const normalizeWords = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const extractProductComponents = (fullName = "", brand = "") => {
  if (!fullName) return { brand: "", model: "", productType: "" };

  const cleanName = String(fullName).trim();
  const explicitBrand = String(brand || "").trim();
  const cleanBrand = explicitBrand.toLowerCase();
  const nameLowercase = cleanName.toLowerCase();

  let resolvedBrand = explicitBrand;
  let remainingName = cleanName;
  if (cleanBrand && nameLowercase.startsWith(`${cleanBrand} `)) {
    remainingName = cleanName.slice(cleanBrand.length).trim();
  } else if (!resolvedBrand) {
    const firstToken = cleanName.split(/\s+/).find(Boolean) || "";
    resolvedBrand = firstToken;
    remainingName = cleanName.slice(firstToken.length).trim();
  }

  const parts = remainingName.split(/\s+/);
  let modelParts = [];
  let productTypeParts = [];
  let foundKeywordAt = -1;

  for (let i = 0; i < parts.length; i++) {
    const part = normalizeToken(parts[i]);
    if (PRODUCT_TYPE_KEYWORDS.has(part)) {
      foundKeywordAt = i;
      break;
    }
  }

  if (foundKeywordAt >= 0) {
    const beforeType = parts.slice(0, foundKeywordAt);
    let modelEndIndex = 0;

    while (
      modelEndIndex < beforeType.length &&
      isModelToken(beforeType[modelEndIndex])
    ) {
      modelEndIndex += 1;
    }

    modelParts = beforeType.slice(0, modelEndIndex);
    const descriptorTokens = beforeType
      .slice(modelEndIndex)
      .filter((item) => !MATERIAL_KEYWORDS.has(normalizeToken(item)));

    productTypeParts = [...descriptorTokens, ...parts.slice(foundKeywordAt)];
  } else if (parts.length > 1) {
    let modelEndIndex = 0;
    while (modelEndIndex < parts.length && isModelToken(parts[modelEndIndex])) {
      modelEndIndex += 1;
    }

    if (modelEndIndex === 0) {
      modelEndIndex = Math.min(2, Math.ceil(parts.length / 2));
    }

    modelParts = parts.slice(0, modelEndIndex);
    productTypeParts = parts.slice(modelEndIndex);
  } else {
    productTypeParts = [remainingName];
  }

  if (productTypeParts.length === 0 && parts.length > 0) {
    productTypeParts = parts;
  }

  return {
    brand: normalizeWords(resolvedBrand),
    model: normalizeWords(modelParts.join(" ")),
    productType: normalizeWords(productTypeParts.join(" ")),
  };
};

const formatBrandForName = (value = "") => {
  const text = normalizeWords(value);
  if (!text) return "";

  // Keep short acronyms/codes as-is (e.g., 3M, KARAM).
  if (/^[A-Z0-9]{2,}$/.test(text)) return text;

  return text
    .split(" ")
    .filter(Boolean)
    .map((part) =>
      /^[A-Z0-9]{2,}$/.test(part)
        ? part
        : `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`,
    )
    .join(" ");
};

const buildProductName = (
  brand = "",
  model = "",
  productType = "",
  fallback = "",
) => {
  const nameParts = [
    formatBrandForName(brand),
    normalizeWords(model),
    normalizeWords(productType),
  ].filter(Boolean);
  if (nameParts.length === 0) return normalizeWords(fallback);
  return normalizeWords(nameParts.join(" "));
};

const cleanSpecificationValue = (value = "") => {
  if (!value) return "";

  const text = String(value).trim();
  let cleaned = text.replace(/\s*\([^)]*\)/g, "");
  cleaned = cleaned.replace(/\s+(approx\.?|approximately)\s*$/i, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  if (cleaned.length > 120) {
    const parts = cleaned.split(/[;,]/)[0].trim();
    return parts.length > 120 ? parts.slice(0, 117) + "..." : parts;
  }

  return cleaned;
};

const asCleanString = (value) =>
  typeof value === "string" ? value.trim() : String(value || "").trim();

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeSignalText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeCategorySlug = (value = "") => {
  const normalizedText = normalizeSignalText(value);
  if (!normalizedText) return "";

  if (CATEGORY_ALIASES[normalizedText]) {
    return CATEGORY_ALIASES[normalizedText];
  }

  const slug = normalizedText.replace(/\s+/g, "-");
  return ALLOWED_CATEGORY_SLUGS.has(slug) ? slug : "";
};

const getCategorySignalScore = (slug = "", signalText = "") => {
  const category = CATEGORY_KEYWORDS.find((entry) => entry.slug === slug);
  if (!category) return 0;

  let score = 0;
  for (const keyword of category.keywords) {
    if (signalText.includes(keyword)) {
      score += keyword.includes(" ") ? 2 : 1;
    }
  }

  return score;
};

const inferCategoryFromSignals = (signalText = "") => {
  const normalizedSignalText = normalizeSignalText(signalText);
  if (!normalizedSignalText) return "";

  let bestSlug = "";
  let bestScore = 0;

  for (const category of CATEGORY_KEYWORDS) {
    const score = getCategorySignalScore(category.slug, normalizedSignalText);
    if (score > bestScore) {
      bestSlug = category.slug;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestSlug : "";
};

const resolveCategory = (
  preferredCategory = "",
  fallbackCategory = "",
  signalText = "",
) => {
  const preferred = normalizeCategorySlug(preferredCategory);
  const fallback = normalizeCategorySlug(fallbackCategory);
  const candidate = preferred || fallback;
  const inferred = inferCategoryFromSignals(signalText);

  if (!candidate) return inferred;
  if (!inferred || inferred === candidate) return candidate;

  const normalizedSignalText = normalizeSignalText(signalText);
  const candidateScore = getCategorySignalScore(
    candidate,
    normalizedSignalText,
  );
  const inferredScore = getCategorySignalScore(inferred, normalizedSignalText);

  return inferredScore > candidateScore ? inferred : candidate;
};

const pickStringWithFallback = (primary, fallback = "") => {
  const fromPrimary = asCleanString(primary);
  if (fromPrimary) return fromPrimary;
  return asCleanString(fallback);
};

const parseGstRate = (value, fallback = 18) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const hasOwn = (obj, key) =>
  Object.prototype.hasOwnProperty.call(obj || {}, key);

const normalizeCertificationToken = (value = "") => {
  const cleaned = String(value || "")
    .replace(/^[^a-zA-Z0-9]+/, "")
    .replace(/[.,;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  if (/^\d{2,4}$/.test(cleaned)) return "";

  return cleaned
    .replace(/\b(en|is|ce|ansi|iso)\b/gi, (token) => token.toUpperCase())
    .replace(/\bpart\b/gi, "Part");
};

const extractCertificationTokens = (value = "") => {
  const normalizedValue = normalizeCertificationToken(value);
  if (!normalizedValue) return [];

  const extracted = CERTIFICATION_PATTERNS.flatMap((pattern) => {
    const matches = normalizedValue.match(pattern) || [];
    return matches.map((match) => normalizeCertificationToken(match));
  }).filter(Boolean);

  if (extracted.length > 0) {
    return extracted;
  }

  return [normalizedValue];
};

const normalizeCertification = (value) => {
  if (value == null) return [];

  const list = Array.isArray(value) ? value : [value];
  const normalized = list
    .flatMap((item) => String(item || "").split(/[;,|\n]/))
    .flatMap((item) => extractCertificationTokens(item))
    .filter(Boolean);

  const unique = [];
  const seen = new Set();

  for (const item of normalized) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
};

const cleanSpecificationKey = (value = "") =>
  String(value || "")
    .replace(/^[^a-zA-Z0-9(]+/, "")
    .replace(/\s+/g, " ")
    .replace(/[:-]+$/g, "")
    .trim();

const normalizeSpecText = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[;,:]+$/g, "")
    .trim();

const isLikelyContactSpecification = (key = "", value = "") => {
  const keyText = normalizeSignalText(key);
  if (CONTACT_KEY_PATTERN.test(keyText)) {
    return true;
  }

  const valueText = normalizeSpecText(value);
  return CONTACT_VALUE_PATTERN.test(valueText);
};

const isFeatureSpecificationKey = (key = "") => {
  const normalizedKey = normalizeSignalText(key);
  if (!normalizedKey) return false;
  return FEATURE_KEY_PHRASES.has(normalizedKey);
};

const flattenSpecificationValueToStrings = (value) => {
  if (!isValuePresent(value)) return [];

  if (typeof value === "string") return [normalizeSpecText(value)];
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenSpecificationValueToStrings(item));
  }

  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([nestedKey, nestedValue]) =>
      flattenSpecificationValueToStrings(nestedValue).map((item) => {
        const cleanKey = cleanSpecificationKey(nestedKey);
        return cleanKey ? `${cleanKey}: ${item}` : item;
      }),
    );
  }

  return [];
};

const isLikelyTruncatedFeature = (value = "") => {
  const text = normalizeSpecText(value);
  if (!text) return true;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 2 && !/\d/.test(text)) {
    return true;
  }

  return text.length < 10 && !/\d/.test(text);
};

const uniqueStrings = (items = []) => {
  const deduped = [];
  const seen = new Set();

  for (const item of items) {
    const normalizedItem = normalizeSpecText(item);
    if (!normalizedItem) continue;

    const key = normalizedItem.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push(normalizedItem);
  }

  return deduped;
};

const toFeatureEntries = (key = "", value = "") => {
  const normalizedKey = normalizeSignalText(key);
  const valueEntries = flattenSpecificationValueToStrings(value)
    .map((item) => normalizeSpecText(item))
    .filter(Boolean)
    .filter((item) => !isLikelyTruncatedFeature(item));

  if (valueEntries.length === 0) return [];

  const isGenericFeatureKey = [
    "feature",
    "features",
    "application",
    "applications",
    "use",
    "uses",
    "usage",
    "benefit",
    "benefits",
    "advantage",
    "advantages",
  ].includes(normalizedKey);

  if (isGenericFeatureKey) {
    return valueEntries;
  }

  const cleanKey = cleanSpecificationKey(key);
  return valueEntries.map((item) => `${cleanKey}: ${item}`);
};

const unwrapNestedDetails = (value) => {
  let current = isPlainObject(value) ? value : {};

  while (
    isPlainObject(current) &&
    Object.keys(current).length === 1 &&
    isPlainObject(current.details)
  ) {
    current = current.details;
  }

  return current;
};

const normalizeVariantField = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const isValuePresent = (value) => {
  if (value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return value !== undefined && value !== null;
};

const normalizeVariantDetails = (value) => {
  if (!isPlainObject(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, val]) => [
        cleanSpecificationKey(key),
        normalizeSpecificationValue(val),
      ])
      .filter(([key, val]) => key && isValuePresent(val)),
  );
};

const normalizeVariantEntry = (entry) => {
  if (entry == null) return null;

  if (typeof entry === "string" || typeof entry === "number") {
    const label = String(entry).trim();
    return label ? { label } : null;
  }

  if (typeof entry !== "object" || Array.isArray(entry)) return null;

  const variant = {};

  const label = normalizeVariantField(
    entry.label ??
      entry.model ??
      entry.name ??
      entry.size ??
      entry.capacity ??
      entry.color,
  );
  const model = normalizeVariantField(entry.model);
  const name = normalizeVariantField(entry.name);
  const size = normalizeVariantField(entry.size);
  const capacity = normalizeVariantField(entry.capacity);
  const color = normalizeVariantField(entry.color);

  if (label) variant.label = label;
  if (model) variant.model = model;
  if (name) variant.name = name;
  if (size) variant.size = size;
  if (capacity) variant.capacity = capacity;
  if (color) variant.color = color;

  const baseDetails = normalizeVariantDetails(
    unwrapNestedDetails(entry.details),
  );
  const extraDetails = normalizeVariantDetails(
    Object.fromEntries(
      Object.entries(entry).filter(
        ([key, val]) =>
          ![
            "label",
            "model",
            "name",
            "size",
            "capacity",
            "color",
            "details",
          ].includes(key) &&
          val !== undefined &&
          val !== null,
      ),
    ),
  );

  const details = {
    ...baseDetails,
    ...extraDetails,
  };

  if (Object.keys(details).length > 0) {
    variant.details = details;
  }

  return Object.keys(variant).length > 0 ? variant : null;
};

const normalizeVariants = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeVariantEntry).filter(Boolean);
};

const normalizeSpecificationValue = (value) => {
  if (value === undefined || value === null) return "";

  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeSpecificationValue(item))
      .filter((item) => {
        if (item === "") return false;
        if (Array.isArray(item)) return item.length > 0;
        if (item && typeof item === "object")
          return Object.keys(item).length > 0;
        return true;
      });
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, val]) => [
          cleanSpecificationKey(key),
          normalizeSpecificationValue(val),
        ])
        .filter(([key, val]) => key && isValuePresent(val)),
    );
  }

  return value;
};

const mergeSpecificationValues = (currentValue, nextValue) => {
  if (!isValuePresent(currentValue)) return nextValue;
  if (!isValuePresent(nextValue)) return currentValue;

  if (Array.isArray(currentValue) && Array.isArray(nextValue)) {
    return [...new Set([...currentValue, ...nextValue])];
  }

  if (isPlainObject(currentValue) && isPlainObject(nextValue)) {
    return {
      ...currentValue,
      ...nextValue,
    };
  }

  return currentValue;
};

const normalizeSpecifications = (value) => {
  if (!isPlainObject(value)) {
    return {};
  }

  const accumulator = {};
  const featureItems = [];

  Object.entries(value)
    .map(([key, val]) => [
      cleanSpecificationKey(key),
      normalizeSpecificationValue(val),
    ])
    .filter(([key, val]) => key && isValuePresent(val))
    .forEach(([key, val]) => {
      if (isLikelyContactSpecification(key, String(val ?? ""))) {
        return;
      }

      if (isFeatureSpecificationKey(key)) {
        featureItems.push(...toFeatureEntries(key, val));
        return;
      }

      if (!hasOwn(accumulator, key)) {
        accumulator[key] = val;
        return;
      }

      accumulator[key] = mergeSpecificationValues(accumulator[key], val);
    });

  const normalizedFeatures = uniqueStrings(featureItems).filter(
    (item) => !isLikelyContactSpecification("Features", item),
  );

  if (normalizedFeatures.length > 0) {
    const existingFeatures = hasOwn(accumulator, "Features")
      ? flattenSpecificationValueToStrings(accumulator.Features)
      : [];

    accumulator.Features = uniqueStrings([
      ...existingFeatures,
      ...normalizedFeatures,
    ]);
  }

  return accumulator;
};

const buildVariantsFromSpecificationModels = (specifications = {}) => {
  const models = specifications?.models;
  if (!Array.isArray(models) || models.length === 0) {
    return { variants: [], specificationsWithoutModels: specifications };
  }

  const variants = normalizeVariants(models);
  const { models: _, ...specificationsWithoutModels } = specifications;

  return { variants, specificationsWithoutModels };
};

const normalizeProductForResponse = (productLike = {}) => {
  const product =
    productLike && typeof productLike.toObject === "function"
      ? productLike.toObject({ flattenMaps: true })
      : { ...productLike };

  const normalizedSpecifications = normalizeSpecifications(
    product.specifications || {},
  );
  const normalizedVariants = normalizeVariants(product.variants || []);

  if (normalizedVariants.length > 0) {
    return {
      ...product,
      variants: normalizedVariants,
      specifications: normalizedSpecifications,
    };
  }

  const { variants, specificationsWithoutModels } =
    buildVariantsFromSpecificationModels(normalizedSpecifications);

  return {
    ...product,
    variants,
    specifications: specificationsWithoutModels,
  };
};

const normalizeProductPayload = (payload = {}) => {
  const normalized = { ...payload };

  if (hasOwn(payload, "certification")) {
    normalized.certification = normalizeCertification(payload.certification);
  }

  if (hasOwn(payload, "specifications")) {
    normalized.specifications = normalizeSpecifications(payload.specifications);
  }

  if (hasOwn(payload, "variants")) {
    normalized.variants = normalizeVariants(payload.variants);
  }

  if (!Array.isArray(normalized.variants) || normalized.variants.length === 0) {
    const { variants, specificationsWithoutModels } =
      buildVariantsFromSpecificationModels(normalized.specifications || {});

    if (variants.length > 0) {
      normalized.variants = variants;
      normalized.specifications = specificationsWithoutModels;
    }
  }

  return normalized;
};

const toSchemaKey = (value = "") =>
  normalizeSignalText(cleanSpecificationKey(value)).replace(/\s+/g, "_");

const toStringArray = (value) => {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => toStringArray(item))
      .map((item) => normalizeSpecText(item))
      .filter(Boolean);
  }

  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, nestedValue]) =>
      toStringArray(nestedValue).map((text) =>
        cleanSpecificationKey(key)
          ? `${cleanSpecificationKey(key)}: ${text}`
          : text,
      ),
    );
  }

  return [normalizeSpecText(String(value))].filter(Boolean);
};

const toStrictSectionObject = (value = {}) => {
  if (!isPlainObject(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([rawKey, rawValue]) => {
        const key = toSchemaKey(rawKey);
        if (!key) return null;
        if (key.length > 48) return null;
        if ((key.match(/_/g) || []).length > 8) return null;

        const normalizedValue = normalizeSpecificationValue(rawValue);
        if (!isValuePresent(normalizedValue)) return null;

        if (isPlainObject(normalizedValue)) return null;

        if (Array.isArray(normalizedValue)) {
          const flattened = flattenSpecificationValueToStrings(normalizedValue)
            .map((entry) => cleanSpecificationValue(normalizeSpecText(entry)))
            .filter(Boolean);
          if (flattened.length === 0) return null;
          return [
            key,
            flattened.length === 1 ? flattened[0] : flattened.join(", "),
          ];
        }

        if (typeof normalizedValue === "string") {
          let cleaned = normalizeSpecText(normalizedValue);
          cleaned = cleanSpecificationValue(cleaned);
          if (cleaned.length > 160) return null;
          if (
            /(feature|features|application|applications|standard|certification|weight|size|dimension|length|width|diameter)\s*:/i.test(
              cleaned,
            )
          ) {
            return null;
          }
          return cleaned ? [key, cleaned] : null;
        }

        return [key, normalizedValue];
      })
      .filter(Boolean),
  );
};

const shortenFeatureSentence = (value = "") => {
  const feature = normalizeSpecText(value);
  if (!feature) return "";

  if (feature.length <= 80) {
    return feature;
  }

  const lowered = feature.toLowerCase();
  if (lowered.includes("shock")) return "Shock absorbing lanyard";
  if (lowered.includes("impact indicator")) return "Impact indicator";
  if (lowered.includes("scaffolding hook")) return "SH-60 scaffolding hooks";
  if (lowered.includes("carabiner")) return "EASY 308 screw gate carabiner";
  if (lowered.includes("ladder")) return "Suitable for ladder climbing";
  if (lowered.includes("rope access"))
    return "Suitable for rope access operations";
  if (lowered.includes("working at height"))
    return "Suitable for working at height";

  return feature.length > 300 ? feature.slice(0, 297) + "..." : feature;
};

const toStrictFeatures = (value) =>
  uniqueStrings(
    toStringArray(value)
      .map((item) => shortenFeatureSentence(item))
      .filter((item) => !isLikelyContactSpecification("features", item))
      .filter(Boolean),
  );

const inferSkuTypeFromName = (name = "", fallbackType = "") => {
  const normalizedName = normalizeSignalText(name);

  if (
    normalizedName.includes("lanyard") ||
    normalizedName.includes("harness")
  ) {
    return "ROPE-LANYARD";
  }

  if (normalizedName.includes("glove")) return "SAFETY-GLOVES";
  if (normalizedName.includes("helmet")) return "SAFETY-HELMET";
  if (normalizedName.includes("shoe")) return "SAFETY-SHOES";
  if (
    normalizedName.includes("respirator") ||
    normalizedName.includes("mask")
  ) {
    return "RESPIRATOR";
  }

  const cleanFallback = String(fallbackType || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleanFallback || "PRODUCT";
};

const buildNormalizedSku = (
  brand = "",
  model = "",
  name = "",
  productType = "",
) => {
  const cleanBrand = String(brand || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  const cleanModel =
    String(model || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "") || "MODEL";
  const skuType = inferSkuTypeFromName(name, productType);

  return [cleanBrand, cleanModel, skuType].filter(Boolean).join("-");
};

const MATERIAL_KEY_PATTERN =
  /\b(material|fabric|rope|coating|shell|webbing|thread|polyester|polyamide|nylon|leather|steel|alloy)\b/i;
const DIMENSION_KEY_PATTERN =
  /\b(length|width|height|diameter|thickness|size|dimension)\b/i;
const PERFORMANCE_KEY_PATTERN =
  /\b(breaking|strength|load|capacity|impact|weight|temperature|force|elongation|tensile|kn|kg)\b/i;
const CHEMICAL_KEY_PATTERN =
  /\b(chemical|acid|alkali|oil|solvent|corrosion|resistan(?:ce|t))\b/i;
const STANDARD_KEY_PATTERN =
  /\b(standard|certification|certificate|compliance|en\s*\d+|is\s*\d+|ansi|iso|ce|isi)\b/i;
const CONNECTOR_KEY_PATTERN =
  /\b(connector|hook|snap|carabiner|d[-\s]?ring|anchor)\b/i;
const FEATURE_KEY_PATTERN =
  /\b(feature|features|application|applications|usage|benefit|advantage|use|uses)\b/i;

const toStrictVariants = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!isPlainObject(entry)) return null;

      const model = pickStringWithFallback(entry.model, entry.label);
      const size = pickStringWithFallback(entry.size, entry.capacity);
      const color = pickStringWithFallback(entry.color);

      const knownKeys = new Set([
        "label",
        "model",
        "name",
        "size",
        "capacity",
        "color",
        "details",
      ]);
      const extraDetails = Object.fromEntries(
        Object.entries(entry).filter(([key]) => !knownKeys.has(key)),
      );

      const details = {
        ...toStrictSectionObject(
          isPlainObject(entry.details) ? entry.details : {},
        ),
        ...toStrictSectionObject(extraDetails),
      };

      if (!model && !size && !color && Object.keys(details).length === 0) {
        return null;
      }

      return {
        model,
        size,
        color,
        details,
      };
    })
    .filter(Boolean);
};

const buildAiReadyProductPayload = (existingProduct = {}, aiDraft = {}) => {
  const draft = isPlainObject(aiDraft) ? aiDraft : {};
  const existing = normalizeProductForResponse(existingProduct);
  const draftName = pickStringWithFallback(draft.name, draft.product_name);
  const draftSku = pickStringWithFallback(draft.sku);
  const draftSlug = pickStringWithFallback(draft.slug);
  const specifications = isPlainObject(draft.specifications)
    ? draft.specifications
    : {};

  const material = toStrictSectionObject(specifications.material);
  const connectors = toStrictSectionObject(specifications.connectors);
  const dimensions = toStrictSectionObject(specifications.dimensions);
  const physicalPerformance = toStrictSectionObject(
    specifications.physical_performance,
  );
  const chemicalResistance = toStrictSectionObject(
    specifications.chemical_resistance,
  );
  const complianceFlags = toStrictSectionObject(
    specifications.compliance_flags,
  );
  const features = toStrictFeatures(specifications.features);
  const standards = normalizeCertification([
    ...toStringArray(specifications.standards),
    ...toStringArray(draft.certification),
  ]);

  Object.entries(specifications)
    .filter(
      ([key]) =>
        ![
          "material",
          "connectors",
          "features",
          "dimensions",
          "physical_performance",
          "chemical_resistance",
          "standards",
          "compliance_flags",
        ].includes(
          String(key || "")
            .trim()
            .toLowerCase(),
        ),
    )
    .forEach(([rawKey, rawValue]) => {
      const normalizedKey = normalizeSignalText(rawKey);
      const entries = toStringArray(rawValue)
        .map((item) => cleanSpecificationValue(normalizeSpecText(item)))
        .filter(Boolean);
      if (entries.length === 0) return;

      const canonicalKey = toSchemaKey(rawKey);
      const joinedValue = entries.join(", ");

      if (!canonicalKey) return;
      if (canonicalKey.length > 48) return;
      if ((canonicalKey.match(/_/g) || []).length > 8) return;
      if (joinedValue.length > 180) return;
      if (
        /(feature|features|application|applications|standard|certification|weight|size|dimension|length|width|diameter)\s*:/i.test(
          joinedValue,
        )
      ) {
        return;
      }
      if (isLikelyContactSpecification(rawKey, joinedValue)) return;
      if (canonicalKey === "source_text") return;

      if (FEATURE_KEY_PATTERN.test(normalizedKey)) {
        features.push(...entries);
        return;
      }

      if (STANDARD_KEY_PATTERN.test(normalizedKey)) {
        standards.push(...normalizeCertification(entries));
        return;
      }

      if (CHEMICAL_KEY_PATTERN.test(normalizedKey)) {
        chemicalResistance[canonicalKey] = joinedValue;
        return;
      }

      if (DIMENSION_KEY_PATTERN.test(normalizedKey)) {
        dimensions[canonicalKey] = joinedValue;
        return;
      }

      if (MATERIAL_KEY_PATTERN.test(normalizedKey)) {
        material[canonicalKey] = joinedValue;
        return;
      }

      if (CONNECTOR_KEY_PATTERN.test(normalizedKey)) {
        connectors[canonicalKey] = joinedValue;
        return;
      }

      if (PERFORMANCE_KEY_PATTERN.test(normalizedKey)) {
        physicalPerformance[canonicalKey] = joinedValue;
        return;
      }

      physicalPerformance[canonicalKey] = joinedValue;
    });

  const moveLongTextToFeatures = (section = {}) => {
    Object.entries(section).forEach(([key, val]) => {
      if (typeof val === "string" && val.length > 40) {
        features.push(val);
        delete section[key];
      }
    });
  };

  moveLongTextToFeatures(material);
  moveLongTextToFeatures(dimensions);
  moveLongTextToFeatures(physicalPerformance);

  const rawName = draftName;
  let brand = pickStringWithFallback(draft.brand);
  let model = "";
  let productType = "";

  if (rawName) {
    const components = extractProductComponents(rawName, brand);
    if (!brand && components.brand) {
      brand = components.brand;
    }
    model = components.model;
    productType = components.productType;
  }

  brand = formatBrandForName(brand);

  // Name must follow: Brand + Model + Product Type.
  const name = buildProductName(brand, model, productType, rawName);

  // SKU must follow: BRAND-MODEL-PRODUCTTYPE with normalized type mapping.
  let sku = buildNormalizedSku(brand, model, name || rawName, productType);
  if (!sku && draftSku) {
    sku = String(draftSku)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  if (!sku && name) {
    sku = String(name)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // Slug must follow lowercase brand-model-product-type.
  const slug = toSlug(name || draftSlug || sku);

  const categorySignals = [
    name,
    sku,
    draft.category,
    JSON.stringify(specifications),
  ]
    .filter(Boolean)
    .join(" ");
  const category = resolveCategory(draft.category, "", categorySignals);

  const derivedCertification = normalizeCertification(
    Array.isArray(draft.certification) && draft.certification.length > 0
      ? draft.certification
      : standards,
  );

  const existingImages = Array.isArray(existing.images)
    ? existing.images.map((item) => asCleanString(item)).filter(Boolean)
    : [];
  const draftImages = Array.isArray(draft.images)
    ? draft.images.map((item) => asCleanString(item)).filter(Boolean)
    : [];
  const resolvedImages = draftImages.length > 0 ? draftImages : existingImages;

  const resolvedDatasheet = pickStringWithFallback(
    draft.datasheet,
    existing.datasheet,
  );

  return {
    sku,
    name,
    slug,
    brand,
    category,
    hsn: pickStringWithFallback(draft.hsn),
    tax: {
      gst_rate: parseGstRate(draft?.tax?.gst_rate, 18),
    },
    pricing: {
      price_type: pickStringWithFallback(
        draft?.pricing?.price_type,
        "price_on_request",
      ),
      display_label: pickStringWithFallback(
        draft?.pricing?.display_label,
        "Price on Request",
      ),
    },
    active: typeof draft.active === "boolean" ? draft.active : true,
    certification: derivedCertification,
    specifications: {
      material,
      connectors,
      features: toStrictFeatures(features),
      dimensions,
      physical_performance: physicalPerformance,
      chemical_resistance: chemicalResistance,
      standards: normalizeCertification(standards),
      compliance_flags: complianceFlags,
    },
    variants: toStrictVariants(draft.variants),
    images: resolvedImages,
    datasheet: resolvedDatasheet,
  };
};

const normalizeProduct = (product = {}) => {
  const raw = product.specifications || {};

  // -------- SPEC KEY NORMALIZATION (lowercase aliases) --------
  const keyAliases = {
    Features: "features",
    Material: "material",
    Dimensions: "dimensions",
    Physical_Performance: "physical_performance",
  };
  Object.entries(keyAliases).forEach(([from, to]) => {
    if (raw[from] !== undefined) {
      if (raw[to] === undefined) raw[to] = raw[from];
      delete raw[from];
    }
  });

  // Force all top-level specification keys to lowercase.
  Object.keys(raw).forEach((key) => {
    const lower = String(key).toLowerCase();
    if (lower !== key) {
      if (raw[lower] === undefined) raw[lower] = raw[key];
      delete raw[key];
    }
  });

  const specs = raw;

  // -------- UNIT MERGE --------
  function mergeUnits(obj) {
    Object.keys(obj).forEach((key) => {
      if (key.endsWith("_unit")) {
        const base = key.replace("_unit", "");
        if (obj[base] !== undefined) {
          obj[base] = `${obj[base]} ${obj[key]}`;
          delete obj[key];
        }
      }
    });
  }

  if (specs.dimensions) mergeUnits(specs.dimensions);
  if (specs.physical_performance) mergeUnits(specs.physical_performance);

  const numericUnitAliases = {
    meter: "m",
    meters: "m",
    metre: "m",
    metres: "m",
    millimeter: "mm",
    millimeters: "mm",
    millimetre: "mm",
    millimetres: "mm",
    centimeter: "cm",
    centimeters: "cm",
    centimetre: "cm",
    centimetres: "cm",
    kilogram: "kg",
    kilograms: "kg",
    gram: "g",
    grams: "g",
    kilonewton: "kn",
    kilonewtons: "kn",
    newton: "n",
    newtons: "n",
    celsius: "c",
    celcius: "c",
    fahrenheit: "f",
    pascal: "pa",
    pascals: "pa",
    kilopascal: "kpa",
    kilopascals: "kpa",
  };

  const numericSuffixes = new Set([
    "m",
    "mm",
    "cm",
    "kg",
    "g",
    "kn",
    "n",
    "kpa",
    "pa",
    "bar",
    "psi",
    "mpa",
    "c",
    "f",
  ]);

  const normalizeUnitToken = (rawUnit = "") => {
    const token = String(rawUnit || "")
      .toLowerCase()
      .replace(/^\u00b0/, "")
      .replace(/[^a-z0-9]+/g, "");
    return numericUnitAliases[token] || token;
  };

  const isMeasurementKey = (key = "") =>
    /(length|diameter|width|height|weight|strength|capacity|temperature|pressure)/.test(
      String(key || "").toLowerCase(),
    );

  // Collapse all measurement key variants into key(unit): numericValue format.
  const sanitizeBaseKeyName = (key = "") =>
    String(key || "")
      .replace(/\([^)]*\)/g, "")
      .replace(/[()]/g, "")
      .replace(/[^a-zA-Z0-9_]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();

  const buildUnitKey = (baseKey = "", unitToken = "") =>
    `${sanitizeBaseKeyName(baseKey)}(${unitToken})`;

  const parseMeasurementValue = (value = "") => {
    const text = String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return null;
    const match = text.match(
      /(-?\d+(?:\.\d+)?)\s*([a-zA-Z\u00b0][a-zA-Z0-9\u00b0/%.-]*)/,
    );
    if (!match) return null;
    const number = Number(match[1]);
    if (!Number.isFinite(number)) return null;
    const unit = normalizeUnitToken(match[2]);
    if (!unit || !numericSuffixes.has(unit)) return null;
    return { number, unit };
  };

  const toNumericCast = (text = "") => {
    const n = Number(String(text ?? "").trim());
    return Number.isFinite(n) ? n : undefined;
  };

  // Normalise measurement sections so all entries use key(unit): numericValue.
  // Collapses key_m / key(m) / key:"1.8 m" / key_unit:"m" patterns into one entry.
  const normalizeMeasurementSection = (section = {}) => {
    if (!section || typeof section !== "object" || Array.isArray(section))
      return;

    const unitHintsByBase = new Map();
    Object.entries({ ...section }).forEach(([rawKey, rawValue]) => {
      const key = String(rawKey || "")
        .trim()
        .toLowerCase();
      const m = key.match(/^(.+)_unit$/);
      if (!m) return;
      const baseKey = sanitizeBaseKeyName(m[1]);
      const unitToken = normalizeUnitToken(String(rawValue || ""));
      if (baseKey && unitToken && numericSuffixes.has(unitToken)) {
        unitHintsByBase.set(baseKey, unitToken);
      }
    });

    const nextSection = {};
    const setValue = (key, value) => {
      if (!key || value === "" || value === null || value === undefined) return;
      if (nextSection[key] !== undefined) {
        const existingNum =
          typeof nextSection[key] === "number" &&
          Number.isFinite(nextSection[key]);
        const incomingNum = typeof value === "number" && Number.isFinite(value);
        if (!existingNum && incomingNum) {
          nextSection[key] = value;
        }
        return;
      }
      nextSection[key] = value;
    };

    Object.entries({ ...section }).forEach(([rawKey, rawValue]) => {
      const nk = String(rawKey || "")
        .trim()
        .toLowerCase();
      if (!nk || nk.endsWith("_unit")) return;

      // Pattern 1: key(unit) already in key name
      const pm = nk.match(/^(.+?)\(([a-z0-9_/%.\-\u00b0 ]+)\)$/i);
      if (pm) {
        const bk = sanitizeBaseKeyName(pm[1]);
        const ut = normalizeUnitToken(pm[2]);
        if (bk && ut && numericSuffixes.has(ut)) {
          const uk = buildUnitKey(bk, ut);
          const num = toNumericCast(String(rawValue ?? "").trim());
          const parsed = parseMeasurementValue(rawValue);
          setValue(
            uk,
            num !== undefined ? num : parsed ? parsed.number : rawValue,
          );
          return;
        }
      }

      // Pattern 2: key_unit suffix in key name
      const sm = nk.match(/^(.+)_([a-z0-9]+)$/);
      if (sm && numericSuffixes.has(sm[2])) {
        const bk = sanitizeBaseKeyName(sm[1]);
        const ut = normalizeUnitToken(sm[2]);
        if (bk && ut && numericSuffixes.has(ut)) {
          const uk = buildUnitKey(bk, ut);
          const num = toNumericCast(String(rawValue ?? "").trim());
          setValue(uk, num !== undefined ? num : rawValue);
          return;
        }
      }

      // Pattern 3: plain key with unit embedded in value string
      const bk = sanitizeBaseKeyName(nk);
      if (!bk) return;
      const parsed = parseMeasurementValue(rawValue);
      const hintUnit = unitHintsByBase.get(bk) || "";
      const ut = normalizeUnitToken(parsed?.unit || hintUnit);
      if (ut && numericSuffixes.has(ut) && (isMeasurementKey(bk) || parsed)) {
        const uk = buildUnitKey(bk, ut);
        setValue(
          uk,
          parsed
            ? parsed.number
            : (toNumericCast(String(rawValue ?? "").trim()) ??
                String(rawValue ?? "").trim()),
        );
        return;
      }

      const cleanVal =
        typeof rawValue === "number" && Number.isFinite(rawValue)
          ? rawValue
          : String(rawValue ?? "")
              .replace(/\s+/g, " ")
              .trim();
      setValue(bk, cleanVal);
    });

    Object.keys(section).forEach((k) => delete section[k]);
    Object.entries(nextSection).forEach(([k, v]) => {
      section[k] = v;
    });
  };

  if (!specs.features) specs.features = [];
  if (!specs.material) specs.material = {};
  if (!specs.connectors) specs.connectors = {};

  const text = JSON.stringify(product).toLowerCase();
  const fallProtectionContext = [
    product?.category,
    product?.name,
    product?.subcategory,
    product?.description,
    product?.product_type,
    Array.isArray(specs.features) ? specs.features.join(" ") : "",
  ]
    .map((value) => String(value || ""))
    .join(" ")
    .toLowerCase();
  const isFallProtectionProduct =
    /lanyard|harness|fall arrest system|fall arrest|fall-protection|fall protection/.test(
      fallProtectionContext,
    );

  // -------- MATERIAL DETECTION --------
  // Stitching thread
  if (
    text.includes("multifilament polyester") ||
    text.includes("high tenacity")
  )
    specs.material.stitching_thread_material =
      "high tenacity multifilament polyester";

  const hasRopeDiameter = Object.keys(specs.dimensions || {}).some((key) =>
    /^rope_diameter(?:\(|_|$)/i.test(String(key || "")),
  );

  // Rope material (priority: polyamide > nylon > polyester).
  // Keep a single canonical key: material.rope
  if (text.includes("polyamide")) specs.material.rope = "polyamide rope";
  else if (text.includes("nylon")) specs.material.rope = "nylon rope";
  else if (text.includes("polyester") && !specs.material.rope)
    specs.material.rope = "polyester rope";

  // Infer from diameter
  if (hasRopeDiameter && !specs.material.rope)
    specs.material.rope = "polyester rope";

  // Cotton liner
  if (text.includes("cotton liner"))
    specs.material.liner_material = "cotton liner";

  // Remove any connector keys accidentally placed in material
  delete specs.material.hook_model;
  delete specs.material.hook_type;
  delete specs.material.carabiner_model;
  delete specs.material.carabiner_type;

  // Keep only one rope key in material.
  if (specs.material.rope_material && !specs.material.rope) {
    specs.material.rope = String(specs.material.rope_material).trim();
  }
  delete specs.material.rope_material;

  // -------- CONNECTOR DETECTION (fall protection only) --------
  if (isFallProtectionProduct) {
    const connectorSource = `${text} ${
      Array.isArray(specs.features)
        ? specs.features.join(" ").toLowerCase()
        : ""
    }`;

    // SH-60 scaffolding hook
    const sh60Match = connectorSource.match(/sh[-\s]?60/);
    if (sh60Match) {
      specs.connectors.hook_model = "SH-60 scaffolding hook";
    } else if (connectorSource.includes("scaffolding hook")) {
      specs.connectors.hook_type = "scaffolding hook";
    }

    // EASY 308 / screw gate carabiner
    const easy308Match = connectorSource.match(/easy[-\s]?308/);
    if (easy308Match) {
      specs.connectors.carabiner_model = "EASY 308 screw gate carabiner";
      specs.connectors.carabiner_type = "screw gate carabiner";
    } else if (connectorSource.includes("screw gate carabiner")) {
      specs.connectors.carabiner_type = "screw gate carabiner";
    } else if (connectorSource.includes("carabiner")) {
      specs.connectors.carabiner_type =
        specs.connectors.carabiner_type || "carabiner";
    }

    // Snap hook
    if (connectorSource.includes("snap hook"))
      specs.connectors.hook_type = specs.connectors.hook_type || "snap hook";

    // D-ring
    if (
      connectorSource.includes("d-ring") ||
      connectorSource.includes("d ring")
    )
      specs.connectors.d_ring = true;
  }

  const normalizeConnectorCompare = (value = "") =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const mergeConnectorStrings = (values = []) => {
    const cleaned = [
      ...new Set(
        values.map((value) => String(value || "").trim()).filter(Boolean),
      ),
    ];

    if (cleaned.length === 0) return "";

    const sorted = [...cleaned].sort(
      (left, right) => String(right).length - String(left).length,
    );

    let merged = sorted[0];
    sorted.slice(1).forEach((candidate) => {
      const mergedNorm = normalizeConnectorCompare(merged);
      const candidateNorm = normalizeConnectorCompare(candidate);
      if (!candidateNorm) return;
      if (mergedNorm.includes(candidateNorm)) return;
      if (candidateNorm.includes(mergedNorm)) {
        merged = candidate;
        return;
      }

      merged = `${merged}; ${candidate}`;
    });

    return merged;
  };

  const mergeConnectorIntoModel = (modelKey = "", sourceKeys = []) => {
    const mergedValue = mergeConnectorStrings(
      [modelKey, ...sourceKeys].map((key) => specs.connectors[key]),
    );

    if (mergedValue) {
      specs.connectors[modelKey] = mergedValue;
    } else {
      delete specs.connectors[modelKey];
    }

    sourceKeys.forEach((key) => {
      if (key !== modelKey) {
        delete specs.connectors[key];
      }
    });
  };

  // Collapse repetitive hook/carabiner entries into one canonical key each.
  mergeConnectorIntoModel("hook_model", [
    "hook_type",
    "scaffolding_hooks",
    "end_hooks",
    "end_hook",
    "hooks",
  ]);
  mergeConnectorIntoModel("carabiner_model", ["carabiner", "carabiner_type"]);

  const hasConnectorInfo = Object.entries(specs.connectors).some(
    ([, value]) => {
      if (typeof value === "string") return value.trim().length > 0;
      if (typeof value === "boolean") return value;
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === "object")
        return Object.keys(value).length > 0;
      return false;
    },
  );

  // Remove alloy steel from material (it belongs to connectors implicitly)
  delete specs.material.carabiner_material;

  // -------- FEATURE CLEANUP (rules 5, 6, 7) --------
  // Phrases that indicate material/hardware — strip from features
  const materialPhrases = [
    /polyester/i,
    /polyamide/i,
    /nylon/i,
    /multifilament/i,
    /alloy steel/i,
    /high tenacity/i,
    /cotton liner/i,
  ];
  const connectorPhrases = [
    /sh[-\s]?60/i,
    /easy[-\s]?308/i,
    /scaffolding hook/i,
    /screw gate carabiner/i,
    /snap hook/i,
    /d[-\s]?ring/i,
    /connector hardware/i,
    /secure anchoring/i,
  ];
  const genericPhrases = [
    "protection from falls",
    "reduces risk of injuries",
    "reduce the risk",
    "energy absorber",
  ];
  const marketingPhrases = [
    "premium quality",
    "high quality",
    "best quality",
    "world class",
    "advanced technology",
    "ideal for",
  ];
  const featureRewriteMap = [
    { match: /shock.*absorb|absorb.*shock/i, out: "Shock absorbing lanyard" },
    { match: /impact indicator/i, out: "Impact indicator for shock load" },
    { match: /ladder/i, out: "Suitable for ladder climbing" },
    { match: /rope access/i, out: "Suitable for rope access operations" },
    { match: /working at height/i, out: "Suitable for working at height" },
    {
      match: /expansion.*contract|contract.*expand/i,
      out: "Expansion and contraction feature",
    },
    {
      match: /continuous.*protection|protection.*continuous/i,
      out: "Continuous fall protection",
    },
    {
      match: /optimized lanyard length for safety|lanyard length/i,
      out: "Designed for fall arrest systems",
    },
  ];

  specs.features = specs.features
    .map((f) => {
      const lower = String(f).toLowerCase();
      // Remove generic safety explanations
      if (genericPhrases.some((g) => lower.includes(g))) return null;
      if (marketingPhrases.some((g) => lower.includes(g))) return null;
      // Remove raw material/connector descriptions from features
      if (materialPhrases.some((r) => r.test(f))) return null;
      if (hasConnectorInfo && connectorPhrases.some((r) => r.test(f)))
        return null;
      // Rewrite known patterns to short phrases
      for (const rule of featureRewriteMap) {
        if (rule.match.test(f)) return rule.out;
      }
      const trimmed = String(f).trim();
      return trimmed;
    .filter(Boolean);

  // Deduplicate while keeping all relevant features.
  specs.features = [...new Set(specs.features)];

  // -------- ENSURE REQUIRED SECTIONS --------
  if (
    !specs.material ||
    typeof specs.material !== "object" ||
    Array.isArray(specs.material)
  )
    specs.material = {};
  if (
    !specs.connectors ||
    typeof specs.connectors !== "object" ||
    Array.isArray(specs.connectors)
  )
    specs.connectors = {};
  if (!Array.isArray(specs.features)) specs.features = [];
  if (
    !specs.dimensions ||
    typeof specs.dimensions !== "object" ||
    Array.isArray(specs.dimensions)
  )
    specs.dimensions = {};
  if (
    !specs.physical_performance ||
    typeof specs.physical_performance !== "object" ||
    Array.isArray(specs.physical_performance)
  )
    specs.physical_performance = {};
  if (
    !specs.chemical_resistance ||
    typeof specs.chemical_resistance !== "object" ||
    Array.isArray(specs.chemical_resistance)
  )
    specs.chemical_resistance = {};
  if (!Array.isArray(specs.standards)) specs.standards = [];
  if (
    !specs.compliance_flags ||
    typeof specs.compliance_flags !== "object" ||
    Array.isArray(specs.compliance_flags)
  )
    specs.compliance_flags = {};

  // -------- AUTO SIZE FROM DIMENSIONS --------
  const lanyardLengthNum =
    specs.dimensions?.["lanyard_length(m)"] ??
    specs.dimensions?.lanyard_length_m ??
    null;
  const lanyardLength =
    lanyardLengthNum !== null && typeof lanyardLengthNum === "number"
      ? `${lanyardLengthNum} m`
      : String(specs.dimensions?.lanyard_length ?? "");

  // -------- VARIANT STRUCTURE (enforce, strip label) --------
  if (product.variants && product.variants.length > 0) {
    product.variants = product.variants.map((v) => ({
      model: v.model || "",
      size: v.size || lanyardLength || "",
      color: v.color || "",
      details: v.details || {},
    }));
  } else {
    product.variants = [];
  }

  // Normalise measurement fields: collapse to key(unit): numericValue format.
  if (specs.dimensions) normalizeMeasurementSection(specs.dimensions);
  if (specs.physical_performance)
    normalizeMeasurementSection(specs.physical_performance);

  product.specifications = specs;

  return product;
};

const getMissingRequiredFields = (payload = {}) =>
  REQUIRED_PRODUCT_FIELDS.filter(
    (field) => !pickStringWithFallback(payload[field]),
  );

const findProductByIdentifier = async (rawIdentifier = "") => {
  const identifier = asCleanString(rawIdentifier);
  if (!identifier) return null;

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Product.findById(identifier);
    if (byId) return byId;
  }

  return Product.findOne({ slug: identifier.toLowerCase() });
};

// @route   GET /api/products
// @desc    Get all products (with filters)
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { category, brand, search, minPrice, maxPrice } = req.query;

    let query = { active: true };

    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (search) {
      query.$text = { $search: search };
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    const normalizedProducts = products.map(normalizeProductForResponse);

    res.json({
      success: true,
      count: normalizedProducts.length,
      products: normalizedProducts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/products/ai-status
// @desc    Get AI/PDF generator readiness for admin tools
// @access  Private/Admin
router.get("/ai-status", [auth, admin], async (req, res) => {
  try {
    const status = productDraftService.getGenerationStatus();

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get generator status",
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const product = await findProductByIdentifier(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      product: normalizeProductForResponse(product),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/products/:id/ai-draft
// @desc    Generate schema-ready draft payload from image/PDF/text
// @access  Private/Admin
router.post(
  "/:id/ai-draft",
  [auth, admin, upload.sourceUpload.single("sourceFile")],
  async (req, res) => {
    try {
      const product = await findProductByIdentifier(req.params.id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const sourceText = asCleanString(req.body?.sourceText);
      const sourceFile = req.file || null;

      if (!sourceText && !sourceFile) {
        return res.status(400).json({
          success: false,
          message: "Provide source text or upload a file",
        });
      }

      const draftResult = await productDraftService.generateDraft({
        sourceText,
        sourceFile,
        existingProduct: normalizeProductForResponse(product),
      });

      const aiJson = buildAiReadyProductPayload(product, draftResult.draft);
      const readyPayload = normalizeProduct(aiJson);
      const missingRequiredFields = getMissingRequiredFields(readyPayload);

      res.json({
        success: true,
        message: "Draft JSON generated successfully",
        draft: readyPayload,
        missingRequiredFields,
        extraction: {
          sourceType: draftResult.sourceType,
          usedAI: draftResult.usedAI,
          usedOCR: Boolean(draftResult.usedOCR),
          provider: draftResult.provider || "",
          model: draftResult.model || "",
          textLength: draftResult.textLength,
          warnings: draftResult.warnings || [],
        },
      });
    } catch (error) {
      const statusCode = error?.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to generate draft JSON",
      });
    }
  },
);

// @route   POST /api/products
// @desc    Create new product
// @access  Private/Admin
router.post("/", [auth, admin], async (req, res) => {
  try {
    const payload = normalizeProduct(normalizeProductPayload(req.body));
    const product = await Product.create(payload);

    res.status(201).json({
      success: true,
      product: normalizeProductForResponse(product),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private/Admin
router.put("/:id", [auth, admin], async (req, res) => {
  try {
    const existingProduct = await findProductByIdentifier(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const existingPayload = normalizeProductPayload(
      normalizeProductForResponse(existingProduct),
    );
    const nextPayload = normalizeProductPayload(req.body);
    const updateMode = asCleanString(req.query?.mode).toLowerCase();
    const useReplaceMode = updateMode === "replace" || updateMode === "full";

    const mergedForReplace = { ...nextPayload };

    // In replace mode, preserve existing images/datasheet when the incoming
    // payload has none — this prevents uploads from disappearing if the
    // client-side JSON omits them.
    if (useReplaceMode) {
      if (
        !Array.isArray(mergedForReplace.images) ||
        mergedForReplace.images.length === 0
      ) {
        mergedForReplace.images = existingPayload.images || [];
      }
      if (!asCleanString(mergedForReplace.datasheet)) {
        mergedForReplace.datasheet = asCleanString(existingPayload.datasheet);
      }
    }

    const payload = useReplaceMode
      ? normalizeProduct(mergedForReplace)
      : normalizeProduct({
          ...existingPayload,
          ...nextPayload,
          specifications: {
            ...(existingPayload.specifications || {}),
            ...(nextPayload.specifications || {}),
          },
        });

    const product = await Product.findByIdAndUpdate(
      existingProduct._id,
      payload,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      product: normalizeProductForResponse(product),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private/Admin
router.delete("/:id", [auth, admin], async (req, res) => {
  try {
    const product = await findProductByIdentifier(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await Product.findByIdAndDelete(product._id);

    res.json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/products/:id/images
// @desc    Update product images
// @access  Private/Admin
router.put("/:id/images", [auth, admin], async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        message: "Images array is required",
      });
    }

    const existingProduct = await findProductByIdentifier(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = await Product.findByIdAndUpdate(
      existingProduct._id,
      { images },
      { new: true, runValidators: true },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product images updated successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/products/:id/datasheet
// @desc    Update product datasheet
// @access  Private/Admin
router.put("/:id/datasheet", [auth, admin], async (req, res) => {
  try {
    const { datasheet } = req.body;

    if (!datasheet) {
      return res.status(400).json({
        success: false,
        message: "Datasheet URL is required",
      });
    }

    const existingProduct = await findProductByIdentifier(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = await Product.findByIdAndUpdate(
      existingProduct._id,
      { datasheet },
      { new: true, runValidators: true },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product datasheet updated successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
