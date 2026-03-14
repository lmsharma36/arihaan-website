const MAX_TEXT_CHARS = 18000;
const DEFAULT_GST_RATE = 18;
const DEFAULT_PRICE_TYPE = "price_on_request";
const DEFAULT_PRICE_LABEL = "Price on Request";
const DEFAULT_OPENAI_MODEL = "gpt-5";
const AI_PROVIDER_OPENAI = "openai";
const SourceTextExtractor = require("./sourceTextExtractor");

const CATEGORY_ALIASES = {
  "head hearing protection": "head-protection",
  "head and hearing protection": "head-protection",
  "eye face protection": "eye-face-protection",
  "eye and face protection": "eye-face-protection",
  "respiratory protection": "respiratory-protection",
  "hand arm protection": "hand-protection",
  "hand and arm protection": "hand-protection",
  "protective clothing": "body-protection",
  "safety footwear": "foot-protection",
  "fall protection": "fall-protection",
  "hand protection": "hand-protection",
  "foot protection": "foot-protection",
  "head protection": "head-protection",
  "eye protection": "eye-face-protection",
  "face protection": "eye-face-protection",
  "hearing protection": "hearing-protection",
  "body protection": "body-protection",
  "head-hearing-protection": "head-protection",
  "hand-arm-protection": "hand-protection",
  "protective-clothing": "body-protection",
  "safety-footwear": "foot-protection",
};

const CATEGORY_OPTIONS = [
  { slug: "fall-protection", label: "Fall Protection" },
  { slug: "hand-protection", label: "Hand Protection" },
  { slug: "foot-protection", label: "Foot Protection" },
  { slug: "head-protection", label: "Head Protection" },
  { slug: "eye-face-protection", label: "Eye & Face Protection" },
  { slug: "hearing-protection", label: "Hearing Protection" },
  { slug: "respiratory-protection", label: "Respiratory Protection" },
  { slug: "body-protection", label: "Body Protection" },
];

const ALLOWED_CATEGORY_SLUGS = new Set(
  CATEGORY_OPTIONS.map((option) => option.slug),
);

const KNOWN_BRANDS = [
  "3M",
  "Honeywell",
  "MSA",
  "DuPont",
  "Ansell",
  "Kimberly-Clark",
  "Drager",
  "Udyogi",
  "Karam",
  "Hillson",
  "Bosch",
  "AAAG",
];

const CATEGORY_KEYWORDS = [
  {
    slug: "head-protection",
    keywords: ["helmet", "hard hat", "bump cap"],
  },
  {
    slug: "hearing-protection",
    keywords: ["earmuff", "earplug", "ear plug"],
  },
  {
    slug: "eye-face-protection",
    keywords: ["goggle", "face shield", "spectacle", "visor"],
  },
  {
    slug: "respiratory-protection",
    keywords: ["respirator", "mask", "cartridge", "n95"],
  },
  {
    slug: "hand-protection",
    keywords: ["glove", "hand protection", "cut resistant"],
  },
  {
    slug: "body-protection",
    keywords: ["coverall", "apron", "protective clothing"],
  },
  {
    slug: "foot-protection",
    keywords: ["shoe", "boot", "footwear", "gumboot"],
  },
  {
    slug: "fall-protection",
    keywords: ["harness", "lanyard", "lifeline", "fall arrest"],
  },
];

const MODEL_OR_SKU_PATTERN =
  /(?:model(?:\s*(?:no|number))?|item\s*code|product\s*code|sku|code)\s*[:#-]?\s*([A-Z0-9][A-Z0-9/_.-]{1,60})/i;
const PRODUCT_NAME_PATTERN =
  /(?:product\s*name|item\s*name|name)\s*[:#-]?\s*([^\n\r]{3,120})/i;
const HSN_PATTERN = /hsn(?:\s*code)?\s*[:#-]?\s*([0-9]{4,10})/i;
const GST_PATTERN =
  /(?:gst(?:\s*rate)?|tax)\s*[:#-]?\s*([0-9]{1,2}(?:\.\d{1,2})?)\s*%?/i;

const escapeRegex = (value = "") =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const BRAND_PATTERN = new RegExp(
  `\\b(${KNOWN_BRANDS.map((brand) => escapeRegex(brand)).join("|")})\\b`,
  "i",
);

const toSku = (value = "") =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

const cleanMatchedValue = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[|,;:-]+$/g, "")
    .trim();

const extractFirstMatch = (text = "", pattern = null) => {
  if (!pattern) return "";
  const match = String(text || "").match(pattern);
  return cleanMatchedValue(match?.[1] || "");
};

const extractBrandFromText = (text = "") => {
  const match = String(text || "").match(BRAND_PATTERN);
  return cleanMatchedValue(match?.[1] || "");
};

const inferCategoryFromText = (text = "") => {
  const normalizedText = String(text || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedText) return "";

  for (const [categoryLabel, slug] of Object.entries(CATEGORY_ALIASES)) {
    if (normalizedText.includes(categoryLabel)) {
      return slug;
    }
  }

  for (const categoryEntry of CATEGORY_KEYWORDS) {
    const foundKeyword = categoryEntry.keywords.some((keyword) =>
      normalizedText.includes(String(keyword).toLowerCase()),
    );

    if (foundKeyword) {
      return categoryEntry.slug;
    }
  }

  return "";
};

const getFirstUsefulLine = (text = "") => {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => cleanMatchedValue(line))
    .filter(Boolean)
    .filter((line) => line.length >= 4 && line.length <= 100)
    .filter(
      (line) =>
        !/^\d+(\.\d+)?$/.test(line) &&
        !/^(model|code|sku|gst|hsn)\b/i.test(line),
    );

  return lines[0] || "";
};

const applyPatternBasedExtraction = (
  sourceText = "",
  draft = {},
  existingProduct = {},
) => {
  const text = String(sourceText || "");
  if (!text.trim()) return { ...draft };

  const enriched = { ...draft };

  if (!enriched.brand) {
    const brand = extractBrandFromText(text);
    if (brand) enriched.brand = brand;
  }

  if (!enriched.category) {
    const category = inferCategoryFromText(text);
    if (category) enriched.category = category;
  }

  if (!enriched.hsn) {
    const hsn = extractFirstMatch(text, HSN_PATTERN);
    if (hsn) enriched.hsn = hsn;
  }

  if (!isPlainObject(enriched.tax) || enriched?.tax?.gst_rate == null) {
    const gstRateText = extractFirstMatch(text, GST_PATTERN);
    const gstRate = toNumberIfPossible(gstRateText);
    if (gstRate !== undefined) {
      enriched.tax = {
        ...(isPlainObject(enriched.tax) ? enriched.tax : {}),
        gst_rate: gstRate,
      };
    }
  }

  const modelOrSku = extractFirstMatch(text, MODEL_OR_SKU_PATTERN);
  if (!enriched.sku && modelOrSku) {
    enriched.sku = cleanMatchedValue(modelOrSku);
  }

  const productName = extractFirstMatch(text, PRODUCT_NAME_PATTERN);
  if (!enriched.name && productName) {
    enriched.name = productName;
  }

  if (!enriched.name) {
    const lineName = getFirstUsefulLine(text);
    if (lineName) {
      enriched.name = lineName;
    }
  }

  if (!enriched.sku && enriched.name) {
    enriched.sku = toSku(enriched.name);
  }

  if (!enriched.slug) {
    enriched.slug = toSlug(
      enriched.name ||
        enriched.sku ||
        existingProduct?.name ||
        existingProduct?.sku ||
        "",
    );
  }

  return enriched;
};

const createHttpError = (statusCode, message, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (details && typeof details === "object") {
    Object.assign(error, details);
  }

  return error;
};

const AI_CONNECTIVITY_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
  "CERT_NOT_YET_VALID",
  "CERT_HAS_EXPIRED",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
]);

const AI_CONNECTIVITY_ERROR_PATTERN =
  /connection error|network error|fetch failed|socket hang up|timed out|timeout|econn|enotfound|eai_again|unable to resolve|dns|certificate is not yet valid|certificate has expired|self signed certificate|unable to verify|tls|ssl/i;

const getAiTransportErrorMessages = (error) =>
  [error?.message, error?.cause?.message, error?.error?.message]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" | ");

const getAiTransportErrorHint = (error) => {
  const codes = [error?.code, error?.cause?.code, error?.error?.code]
    .map((value) =>
      String(value || "")
        .trim()
        .toUpperCase(),
    )
    .filter(Boolean);
  const messages = getAiTransportErrorMessages(error);

  if (
    codes.includes("CERT_NOT_YET_VALID") ||
    /certificate is not yet valid/i.test(messages)
  ) {
    return "Check the server system date/time and sync Windows time before retrying AI generation.";
  }

  if (
    codes.includes("CERT_HAS_EXPIRED") ||
    /certificate has expired/i.test(messages)
  ) {
    return "The TLS certificate being presented to the server is expired. Check SSL inspection on the current network or try another network.";
  }

  if (
    codes.some((code) =>
      [
        "SELF_SIGNED_CERT_IN_CHAIN",
        "DEPTH_ZERO_SELF_SIGNED_CERT",
        "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
      ].includes(code),
    ) ||
    /self signed certificate|unable to verify/i.test(messages)
  ) {
    return "The current network appears to be intercepting HTTPS traffic. Check proxy or antivirus SSL inspection settings, or try another network.";
  }

  return "";
};

const buildAiFallbackWarning = (error, options = {}) => {
  const { connectionIssue = false } = options;
  const message = String(error?.message || "Unknown error");
  const baseMessage = connectionIssue
    ? `AI parsing failed due to connection/network issue (${message}). Heuristic parsing was used as fallback.`
    : `AI parsing failed (${message}). Heuristic parsing was used instead.`;
  const hint = getAiTransportErrorHint(error);

  return hint ? `${baseMessage} ${hint}` : baseMessage;
};

const isAiConnectivityError = (error) => {
  if (!error) return false;

  const codes = [error?.code, error?.cause?.code, error?.error?.code]
    .map((value) =>
      String(value || "")
        .trim()
        .toUpperCase(),
    )
    .filter(Boolean);

  if (codes.some((code) => AI_CONNECTIVITY_ERROR_CODES.has(code))) {
    return true;
  }

  const messages = getAiTransportErrorMessages(error);

  return AI_CONNECTIVITY_ERROR_PATTERN.test(messages);
};

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

const trimTo = (value = "", maxChars = MAX_TEXT_CHARS) =>
  String(value || "")
    .split("\u0000")
    .join("")
    .trim()
    .slice(0, maxChars);

const delay = (ms = 0) =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });

const toSlug = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/["'`]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);

const normalizeCategory = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (CATEGORY_ALIASES[normalized]) {
    return CATEGORY_ALIASES[normalized];
  }

  const slug = normalized.replace(/\s+/g, "-");
  return ALLOWED_CATEGORY_SLUGS.has(slug) ? slug : "";
};

const toBoolean = (value, fallback = undefined) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "active", "enabled"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "n", "inactive", "disabled"].includes(normalized)) {
    return false;
  }

  return fallback;
};

const toNumberIfPossible = (value, fallback = undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return fallback;

  const cleaned = value.trim().replace(/,/g, "");
  if (
    !/^[-+]?\d*(\.\d+)?$/.test(cleaned) ||
    cleaned === "" ||
    cleaned === "."
  ) {
    return fallback;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const splitList = (value = "") =>
  String(value || "")
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

const coerceLooseValue = (value) => {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    return value
      .map((item) => coerceLooseValue(item))
      .filter((item) => {
        if (item === "") return false;
        if (Array.isArray(item)) return item.length > 0;
        if (isPlainObject(item)) return Object.keys(item).length > 0;
        return true;
      });
  }

  if (isPlainObject(value)) {
    const objectValue = Object.fromEntries(
      Object.entries(value)
        .map(([key, nestedValue]) => [
          String(key || "").trim(),
          coerceLooseValue(nestedValue),
        ])
        .filter(([key, nestedValue]) => {
          if (!key) return false;
          if (nestedValue === "") return false;
          if (Array.isArray(nestedValue)) return nestedValue.length > 0;
          if (isPlainObject(nestedValue)) {
            return Object.keys(nestedValue).length > 0;
          }
          return true;
        }),
    );

    return objectValue;
  }

  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : "";
  }

  const text = String(value).trim();
  if (!text) return "";

  const booleanValue = toBoolean(text);
  if (booleanValue !== undefined) return booleanValue;

  const numericValue = toNumberIfPossible(text);
  if (numericValue !== undefined) return numericValue;

  return text;
};

const sanitizeSpecifications = (value) => {
  if (!isPlainObject(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([rawKey, rawValue]) => [
        String(rawKey || "").trim(),
        coerceLooseValue(rawValue),
      ])
      .filter(([key, specValue]) => {
        if (!key) return false;
        if (specValue === "") return false;
        if (Array.isArray(specValue)) return specValue.length > 0;
        if (isPlainObject(specValue)) return Object.keys(specValue).length > 0;
        return true;
      }),
  );
};

const stringifyForPrompt = (value, maxChars = MAX_TEXT_CHARS) => {
  try {
    return trimTo(JSON.stringify(value, null, 2), maxChars);
  } catch (error) {
    return trimTo(String(value || ""), maxChars);
  }
};

const buildSchemaTemplate = () => ({
  sku: "",
  name: "",
  slug: "",
  brand: "",
  category: CATEGORY_OPTIONS[0].slug,
  hsn: "",
  tax: {
    gst_rate: DEFAULT_GST_RATE,
  },
  pricing: {
    price_type: DEFAULT_PRICE_TYPE,
    display_label: DEFAULT_PRICE_LABEL,
  },
  active: true,
  certification: [],
  specifications: {
    material: {},
    connectors: {},
    features: [],
    dimensions: {},
    physical_performance: {},
    chemical_resistance: {},
    standards: [],
    compliance_flags: {},
  },
  variants: [
    {
      model: "",
      size: "",
      color: "",
      details: {},
    },
  ],
  images: [],
  datasheet: "",
});

const mergeUniqueStrings = (...lists) => [
  ...new Set(
    lists
      .flat()
      .map((item) => String(item || "").trim())
      .filter(Boolean),
  ),
];

const sanitizeVariantForDraft = (value = {}) => {
  if (!isPlainObject(value)) return null;

  const knownFields = ["label", "model", "name", "size", "capacity", "color"];
  const variant = {};

  for (const field of knownFields) {
    const normalized = String(value?.[field] ?? "").trim();
    if (normalized) {
      variant[field] = normalized;
    }
  }

  const detailsSource = isPlainObject(value.details) ? value.details : {};
  const detailEntries = Object.entries(detailsSource)
    .map(([key, val]) => {
      const cleanedKey = String(key || "").trim();
      if (!cleanedKey) return null;

      const coerced = coerceLooseValue(val);
      if (coerced === "") return null;
      if (isPlainObject(coerced)) return null;

      if (Array.isArray(coerced)) {
        const asText = coerced
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
          .join(", ");
        if (!asText) return null;
        return [cleanedKey, asText];
      }

      return [cleanedKey, coerced];
    })
    .filter(Boolean);

  if (detailEntries.length > 0) {
    variant.details = Object.fromEntries(detailEntries);
  }

  return Object.keys(variant).length > 0 ? variant : null;
};

const mergeDrafts = (primaryDraft = {}, supplementDraft = {}) => {
  const primary = sanitizeAiDraft(primaryDraft);
  const supplement = sanitizeAiDraft(supplementDraft);

  return sanitizeAiDraft({
    sku: primary.sku || supplement.sku,
    name: primary.name || supplement.name,
    slug: primary.slug || supplement.slug,
    brand: primary.brand || supplement.brand,
    category: primary.category || supplement.category,
    hsn: primary.hsn || supplement.hsn,
    tax: {
      gst_rate:
        primary?.tax?.gst_rate ?? supplement?.tax?.gst_rate ?? DEFAULT_GST_RATE,
    },
    pricing: {
      price_type:
        primary?.pricing?.price_type ||
        supplement?.pricing?.price_type ||
        DEFAULT_PRICE_TYPE,
      display_label:
        primary?.pricing?.display_label ||
        supplement?.pricing?.display_label ||
        DEFAULT_PRICE_LABEL,
    },
    active:
      typeof primary.active === "boolean" ? primary.active : supplement.active,
    certification: mergeUniqueStrings(
      supplement.certification || [],
      primary.certification || [],
    ),
    specifications: {
      ...(supplement.specifications || {}),
      ...(primary.specifications || {}),
    },
    variants:
      Array.isArray(primary.variants) && primary.variants.length > 0
        ? primary.variants
        : Array.isArray(supplement.variants)
          ? supplement.variants
          : [],
    images:
      Array.isArray(primary.images) && primary.images.length > 0
        ? primary.images
        : Array.isArray(supplement.images)
          ? supplement.images
          : [],
    datasheet: primary.datasheet || supplement.datasheet || "",
  });
};

const sanitizeAiDraft = (draft = {}) => {
  if (!isPlainObject(draft)) {
    return {};
  }

  const sanitized = {};

  if (typeof draft.sku === "string" && draft.sku.trim()) {
    sanitized.sku = draft.sku.trim();
  }

  const resolvedName =
    typeof draft.name === "string" && draft.name.trim()
      ? draft.name
      : typeof draft.product_name === "string" && draft.product_name.trim()
        ? draft.product_name
        : "";

  if (resolvedName) {
    sanitized.name = resolvedName.trim();
  }

  if (typeof draft.slug === "string" && draft.slug.trim()) {
    sanitized.slug = toSlug(draft.slug);
  } else if (sanitized.name || sanitized.sku) {
    sanitized.slug = toSlug(sanitized.name || sanitized.sku);
  }

  if (typeof draft.brand === "string" && draft.brand.trim()) {
    sanitized.brand = draft.brand.trim();
  }

  if (typeof draft.category === "string" && draft.category.trim()) {
    sanitized.category = normalizeCategory(draft.category);
  }

  if (typeof draft.hsn === "string") {
    sanitized.hsn = draft.hsn.trim();
  }

  if (
    isPlainObject(draft.tax) ||
    draft.gstRate !== undefined ||
    draft.gst !== undefined
  ) {
    const gstRaw =
      draft?.tax?.gst_rate ?? draft?.tax?.gstRate ?? draft.gstRate ?? draft.gst;

    const gstRate = toNumberIfPossible(
      String(gstRaw ?? "").trim(),
      DEFAULT_GST_RATE,
    );
    sanitized.tax = { gst_rate: gstRate };
  }

  if (isPlainObject(draft.pricing) || draft.price_type || draft.display_label) {
    const priceType =
      String(
        draft?.pricing?.price_type || draft.price_type || DEFAULT_PRICE_TYPE,
      ).trim() || DEFAULT_PRICE_TYPE;
    const displayLabel =
      String(
        draft?.pricing?.display_label ||
          draft.display_label ||
          DEFAULT_PRICE_LABEL,
      ).trim() || DEFAULT_PRICE_LABEL;

    sanitized.pricing = {
      price_type: priceType,
      display_label: displayLabel,
    };
  }

  if (draft.active !== undefined) {
    const active = toBoolean(draft.active, true);
    sanitized.active = active;
  }

  if (Array.isArray(draft.certification)) {
    sanitized.certification = draft.certification
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  } else if (typeof draft.certification === "string") {
    sanitized.certification = splitList(draft.certification);
  } else if (Array.isArray(draft?.specifications?.standards)) {
    sanitized.certification = draft.specifications.standards
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (isPlainObject(draft.specifications)) {
    sanitized.specifications = sanitizeSpecifications(draft.specifications);
  }

  if (Array.isArray(draft.variants)) {
    sanitized.variants = draft.variants
      .map((item) => sanitizeVariantForDraft(item))
      .filter(Boolean);
  }

  if (Array.isArray(draft.images)) {
    sanitized.images = draft.images
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof draft.datasheet === "string") {
    sanitized.datasheet = draft.datasheet.trim();
  }

  return sanitized;
};

const stripCodeFences = (value = "") => {
  const text = String(value || "").trim();

  if (!text.startsWith("```")) {
    return text;
  }

  return text
    .replace(/^```[a-zA-Z]*\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
};

const stripUnsafeControlChars = (value = "") =>
  Array.from(String(value || ""))
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 || code === 9 || code === 10 || code === 13;
    })
    .join("");

const normalizeJsonText = (value = "") =>
  stripUnsafeControlChars(String(value || ""))
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u00a0/g, " ")
    .trim();

const removeTrailingCommas = (value = "") =>
  String(value || "").replace(/,\s*([}\]])/g, "$1");

const isResponseFormatCompatibilityError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("response_format") ||
    message.includes("json_object") ||
    message.includes("unsupported parameter")
  );
};

const extractAssistantTextContent = (content) => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (!item || typeof item !== "object") {
          return "";
        }

        if (typeof item.text === "string") {
          return item.text;
        }

        if (typeof item.content === "string") {
          return item.content;
        }

        if (typeof item.value === "string") {
          return item.value;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  if (content && typeof content === "object") {
    if (typeof content.text === "string") {
      return content.text;
    }

    if (typeof content.content === "string") {
      return content.content;
    }
  }

  return String(content || "");
};

const extractBalancedJsonObject = (value = "") => {
  const text = String(value || "");
  const start = text.indexOf("{");
  if (start === -1) return "";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return "";
};

const buildJsonCandidates = (value = "") => {
  const cleaned = normalizeJsonText(stripCodeFences(value));
  const candidates = [cleaned];

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
  }

  const balancedCandidate = extractBalancedJsonObject(cleaned);
  if (balancedCandidate) {
    candidates.push(balancedCandidate);
  }

  return [
    ...new Set(
      candidates
        .map((candidate) => normalizeJsonText(candidate))
        .filter(Boolean)
        .flatMap((candidate) => [candidate, removeTrailingCommas(candidate)]),
    ),
  ];
};

const extractJsonFromResponse = (value = "") => {
  const candidates = buildJsonCandidates(value);
  if (candidates.length === 0) {
    throw new Error("AI response did not return valid JSON");
  }

  let lastError = null;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError?.message || "AI response did not return valid JSON",
  );
};

const parseKeyValueLines = (text = "") => {
  const pairs = [];

  String(text || "")
    .split(/\r?\n/)
    .forEach((line) => {
      const cleaned = String(line || "")
        .replace(/^[\s*\-\u2022]+/, "")
        .trim();

      if (!cleaned) return;

      const separatorIndex = cleaned.indexOf(":");
      if (separatorIndex <= 0 || separatorIndex === cleaned.length - 1) {
        return;
      }

      const key = cleaned.slice(0, separatorIndex).trim();
      const value = cleaned.slice(separatorIndex + 1).trim();

      if (key && value) {
        pairs.push([key, value]);
      }
    });

  return pairs;
};

const assignHeuristicField = (draft, rawKey, rawValue) => {
  const key = String(rawKey || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const value = String(rawValue || "").trim();

  if (!key || !value) return false;

  if (/^(sku|item code|product code|code|model no|model number)$/.test(key)) {
    draft.sku = value;
    return true;
  }

  if (/^(name|product name|item name|title)$/.test(key)) {
    draft.name = value;
    return true;
  }

  if (key === "slug") {
    draft.slug = toSlug(value);
    return true;
  }

  if (/^(brand|make|manufacturer)$/.test(key)) {
    draft.brand = value;
    return true;
  }

  if (/^(category|product category|category name)$/.test(key)) {
    draft.category = normalizeCategory(value);
    return true;
  }

  if (/^(hsn|hsn code)$/.test(key)) {
    draft.hsn = value;
    return true;
  }

  if (/gst|tax/.test(key)) {
    const parsedGst = toNumberIfPossible(value);
    if (parsedGst !== undefined) {
      draft.tax = { gst_rate: parsedGst };
      return true;
    }
  }

  if (key === "active" || key === "status") {
    const active = toBoolean(value);
    if (active !== undefined) {
      draft.active = active;
      return true;
    }
  }

  if (/price type/.test(key)) {
    draft.pricing = {
      ...(draft.pricing || {}),
      price_type: value,
    };
    return true;
  }

  if (/price label|display label/.test(key)) {
    draft.pricing = {
      ...(draft.pricing || {}),
      display_label: value,
    };
    return true;
  }

  if (/certification|certificate|standard|compliance/.test(key)) {
    draft.certification = splitList(value);
    return true;
  }

  draft.specifications = {
    ...(draft.specifications || {}),
    [rawKey]: coerceLooseValue(value),
  };
  return true;
};

const buildHeuristicDraft = (text = "", existingProduct = {}, options = {}) => {
  const { includeSourceTextFallback = true } = options;
  const draft = {};
  const pairs = parseKeyValueLines(text);

  pairs.forEach(([key, value]) => {
    assignHeuristicField(draft, key, value);
  });

  // OCR/PDF text often has important values outside key:value format.
  Object.assign(
    draft,
    applyPatternBasedExtraction(text, draft, existingProduct),
  );

  if (pairs.length === 0 && includeSourceTextFallback) {
    const condensed = trimTo(text, 500);
    if (condensed) {
      draft.specifications = {
        source_text: condensed,
      };
    }
  }

  if (!draft.slug) {
    const candidateName = draft.name || existingProduct.name || "";
    const candidateSku = draft.sku || existingProduct.sku || "";
    draft.slug = toSlug(candidateName || candidateSku);
  }

  if (!draft.sku && draft.name) {
    draft.sku = toSku(draft.name);
  }

  return sanitizeAiDraft(draft);
};

class ProductDraftService {
  constructor() {
    this.openAIClient = null;
    this.textExtractor = new SourceTextExtractor({
      maxTextChars: MAX_TEXT_CHARS,
    });
  }

  hasOpenAIConfiguration() {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  getConfiguredAiProvider() {
    return AI_PROVIDER_OPENAI;
  }

  resolveActiveAiProvider({ allowFallback = true } = {}) {
    if (this.hasOpenAIConfiguration()) {
      return AI_PROVIDER_OPENAI;
    }
    return null;
  }

  getOpenAIClient() {
    if (!this.hasOpenAIConfiguration()) {
      return null;
    }

    if (this.openAIClient) {
      return this.openAIClient;
    }

    let OpenAI;
    try {
      OpenAI = require("openai");
    } catch (error) {
      throw createHttpError(
        500,
        "openai dependency is missing. Run npm install in server folder.",
      );
    }

    this.openAIClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    return this.openAIClient;
  }

  getPdfParser() {
    return this.textExtractor.getPdfParser();
  }

  getTesseract() {
    return this.textExtractor.getTesseract();
  }

  hasPdfParser() {
    return this.textExtractor.hasPdfParser();
  }

  hasTesseract() {
    try {
      this.getTesseract();
      return true;
    } catch (error) {
      return false;
    }
  }

  getGenerationStatus() {
    const configuredProvider = this.getConfiguredAiProvider();
    const activeAiProvider = this.resolveActiveAiProvider();
    const aiConfigured = Boolean(activeAiProvider);
    const openAIConfigured = this.hasOpenAIConfiguration();
    const pdfParserAvailable = this.hasPdfParser();
    const tesseractAvailable = this.hasTesseract();
    const supportsImageAI =
      aiConfigured &&
      (activeAiProvider === AI_PROVIDER_OPENAI || tesseractAvailable);

    return {
      aiConfigured,
      aiProviderPreference: configuredProvider,
      activeAiProvider,
      openAIConfigured,
      pdfParserAvailable,
      tesseractAvailable,
      supportsTextAI: aiConfigured,
      supportsImageAI,
      supportsPdfExtraction: pdfParserAvailable,
      textModel: aiConfigured
        ? this.getPreferredModel("text", activeAiProvider)
        : "",
      imageModel: supportsImageAI
        ? this.getPreferredModel("image", activeAiProvider)
        : "",
    };
  }

  async extractTextFromPdfBuffer(buffer) {
    return this.textExtractor.extractTextFromPdfBuffer(buffer);
  }

  async extractTextFromImageBuffer(buffer) {
    return this.textExtractor.extractTextFromImageBuffer(buffer);
  }

  getPreferredOpenAIModel(sourceType = "text") {
    return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  }

  getPreferredModel(sourceType = "text", provider = null) {
    return this.getPreferredOpenAIModel(sourceType);
  }

  getAiSourceTextChars(provider = null) {
    // For OpenAI, use env var or default to MAX_TEXT_CHARS
    const openAiMax = toPositiveInteger(
      process.env.OPENAI_MAX_SOURCE_TEXT_CHARS,
      MAX_TEXT_CHARS,
    );
    return openAiMax;
  }

  isAiStrictModeEnabled() {
    return toBoolean(process.env.AI_REQUIRE_SUCCESS, false) === true;
  }

  getAiRetryAttempts() {
    return Math.max(1, toPositiveInteger(process.env.AI_RETRY_ATTEMPTS, 3));
  }

  getOpenAiJsonRepairMaxTokens() {
    return Math.max(
      256,
      toPositiveInteger(process.env.OPENAI_JSON_REPAIR_MAX_TOKENS, 1600),
    );
  }

  getOpenAiRetryMaxTokens(baseMaxTokens = 800) {
    const suggested = Math.max(baseMaxTokens * 2, 1200);
    return Math.max(
      baseMaxTokens,
      toPositiveInteger(process.env.OPENAI_RETRY_MAX_TOKENS, suggested),
    );
  }

  async parseOpenAiDraftContent(
    content = "",
    model = "",
    sourceType = "text",
    maxTokens = 800,
  ) {
    try {
      return sanitizeAiDraft(extractJsonFromResponse(content));
    } catch (parseError) {
      const client = this.getOpenAIClient();
      if (!client) {
        throw parseError;
      }

      const repairModel = model || this.getPreferredOpenAIModel(sourceType);
      const usesCompletionTokens = /^gpt-5(?:$|[-.])/i.test(repairModel);
      const repairMaxTokens = Math.max(
        Math.max(maxTokens, 256),
        this.getOpenAiJsonRepairMaxTokens(),
      );
      const rawContent = trimTo(stripCodeFences(String(content || "")), 12000);

      // Always log parse errors for diagnosis
      console.error(
        `[AI_DRAFT_PARSE_FAIL] sourceType=${sourceType} model=${model}` +
          ` parseError="${parseError.message}"` +
          ` rawContentLen=${rawContent.length}` +
          ` contentPreview="${rawContent.slice(0, 120).replace(/\n/g, " ")}"`,
      );

      if (!rawContent) {
        // GPT returned empty response - repair won't help, fail clearly
        throw createHttpError(
          502,
          `GPT model returned empty or blank content (no JSON found). Verify the model (${repairModel}) is available and the API key is valid.`,
        );
      }

      try {
        const repairPayload = {
          model: repairModel,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: [
                "You MUST convert the provided content into a valid, complete JSON object.",
                "If partial JSON, complete it. If text, extract as key-value pairs.",
                "Your response MUST be pure JSON only. No markdown, no explanation.",
                "Start with { and end with }. First character must be {. Last must be }.",
                "Return valid JSON parseable by JSON.parse(). Unknown values should be empty strings.",
              ].join("\n"),
            },
            {
              role: "user",
              content: [
                "Convert this content into ONE valid JSON object. Return ONLY the JSON:",
                "",
                rawContent,
              ].join("\n"),
            },
          ],
        };

        if (!usesCompletionTokens) {
          repairPayload.temperature = 0;
        }

        if (usesCompletionTokens) {
          repairPayload.max_completion_tokens = repairMaxTokens;
        } else {
          repairPayload.max_tokens = repairMaxTokens;
        }

        const repairCompletion =
          await client.chat.completions.create(repairPayload);

        const repairedContent = extractAssistantTextContent(
          repairCompletion?.choices?.[0]?.message?.content,
        );

        // Validate repair output is also JSON
        const repairTrimmed = String(repairedContent || "").trim();
        if (!repairTrimmed.startsWith("{") || !repairTrimmed.endsWith("}")) {
          throw createHttpError(
            502,
            `JSON repair call also failed. Response started with '${repairTrimmed.slice(0, 15)}...' instead of {. Cannot recover.`,
          );
        }

        return sanitizeAiDraft(extractJsonFromResponse(repairedContent));
      } catch (repairError) {
        throw createHttpError(
          502,
          `OpenAI returned malformed JSON (${parseError.message}). Auto-repair failed (${repairError?.message || "unknown error"}).`,
          {
            isOpenAiMalformedJson: true,
          },
        );
      }
    }
  }

  decodeTextFile(buffer = Buffer.from("")) {
    if (!buffer) return "";
    try {
      return trimTo(
        String(buffer.toString("utf8") || "").trim(),
        MAX_TEXT_CHARS,
      );
    } catch (error) {
      return "";
    }
  }

  buildSystemPrompt(existingProduct = {}, sourceMeta = {}, provider = null) {
    const categoriesList = CATEGORY_OPTIONS.map((c) => c.slug).join(", ");

    return [
      "You are a product data extraction assistant for an industrial safety equipment (PPE) catalogue.",
      "Extract product details from the provided source and return ONLY a single valid JSON object.",
      "",
      "⚠️ CRITICAL: Return ONLY valid JSON. Your ENTIRE response must start with { and end with }.",
      "⚠️ No markdown, no code fences, no explanation. JSON ONLY that can be parsed by JSON.parse().",
      "",
      "REQUIRED JSON FIELDS:",
      '{ "sku": "", "name": "", "slug": "", "brand": "", "category": "...", "hsn": "",',
      '  "tax": { "gst_rate": 18 },',
      '  "pricing": { "price_type": "price_on_request", "display_label": "Price on Request" },',
      '  "certification": [],',
      '  "specifications": {',
      '    "material": {}, "connectors": {}, "features": [], "dimensions": {},',
      '    "physical_performance": {}, "chemical_resistance": {}, "standards": [], "compliance_flags": {}',
      "  },",
      '  "variants": [{ "model": "", "size": "", "color": "", "details": {} }]',
      "}",
      "",
      `Valid category values: ${categoriesList}`,
      "",
      "RULES:",
      "1. Leave fields as empty string or empty array if not found. Never use null.",
      "2. Do not output duplicate or near-duplicate entries inside connectors, dimensions, or physical_performance.",
      "3. Measurement fields must use ONLY one key format with unit in key: key(unit). Example: lanyard_length(m): 1.8",
      "4. Do NOT output legacy duplicate unit formats like key + key_m or key + key_unit.",
      "5. Use exactly one pair of parentheses for measurement unit keys: key(unit).",
      "6. specifications.material - physical materials only (polyester, nylon, etc.).",
      "7. specifications.features - max 6 short benefit statements as string array.",
      "8. specifications.standards - certifications/standards as string array (EN 361, IS 3521, etc.).",
      "9. Each variant: { model, size, color, details } only.",
      "10. sku should be uppercase with hyphens, e.g. KRM-FBH-DL",
      "11. All alphabetic string values must start with a capital letter.",
      "12. Return ONLY valid JSON. First character must be {. Last character must be }.",
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  buildContextPrompt(sourceText = "", sourceMeta = {}, provider = null) {
    const activeProvider = provider || this.resolveActiveAiProvider();
    const sourceTextChars = this.getAiSourceTextChars(activeProvider);

    return [
      "CRITICAL: Extract ALL product information from the source below and return ONLY valid JSON:",
      "",
      "Source metadata:",
      sourceMeta && Object.keys(sourceMeta).length > 0
        ? stringifyForPrompt({ sourceMeta }, 400)
        : "(No metadata)",
      "",
      "═══ SOURCE CONTENT BEGIN ═══",
      trimTo(sourceText, sourceTextChars),
      "═══ SOURCE CONTENT END ═══",
      "",
      "⚠️ RESPONSE REQUIREMENT: Output ONLY a valid JSON object. First character: {. Last character: }.",
      "⚠️ No text before. No text after. No markdown code fences. JSON ONLY.",
      "Use measurement keys in key(unit) format only. Do not duplicate legacy key_m or key_unit fields.",
      "All alphabetic string values should begin with a capital letter.",
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  buildImageContextPrompt(
    imageBuffer,
    mimeType = "",
    sourceText = "",
    sourceMeta = {},
    provider = null,
  ) {
    if (!imageBuffer) {
      throw createHttpError(400, "Image file is required for AI extraction.");
    }

    const activeProvider = provider || this.resolveActiveAiProvider();
    const sourceTextChars = this.getAiSourceTextChars(activeProvider);
    const normalizedMimeType =
      String(mimeType || sourceMeta?.mimeType || "image/jpeg").trim() ||
      "image/jpeg";
    const imageDataUrl = `data:${normalizedMimeType};base64,${Buffer.from(
      imageBuffer,
    ).toString("base64")}`;

    const textParts = [
      "Extract all product information from this image and return JSON only.",
      sourceMeta && Object.keys(sourceMeta).length > 0
        ? stringifyForPrompt({ sourceMeta }, 400)
        : null,
      sourceText
        ? `Additional text context:\n${trimTo(sourceText, sourceTextChars)}`
        : null,
    ].filter(Boolean);

    return [
      {
        type: "text",
        text: textParts.join("\n\n"),
      },
      {
        type: "image_url",
        image_url: {
          url: imageDataUrl,
          detail: "low",
        },
      },
    ];
  }

  async generateDraftFromText(
    sourceText = "",
    existingProduct = {},
    sourceMeta = {},
    aiProvider = null,
  ) {
    const provider = aiProvider || this.resolveActiveAiProvider();
    if (!provider) {
      throw createHttpError(
        400,
        "No AI provider is configured. Configure OpenAI.",
      );
    }

    const messages = [
      {
        role: "system",
        content: this.buildSystemPrompt(existingProduct, sourceMeta, provider),
      },
      {
        role: "user",
        content: this.buildContextPrompt(sourceText, sourceMeta, provider),
      },
    ];

    return this.requestJsonFromOpenAI(messages, "text");
  }

  async generateDraftFromImage(
    imageBuffer,
    mimeType = "",
    sourceText = "",
    existingProduct = {},
    sourceMeta = {},
  ) {
    const provider = this.resolveActiveAiProvider();
    if (!provider) {
      throw createHttpError(
        400,
        "No AI provider is configured. Configure OpenAI.",
      );
    }

    const mergedMeta = {
      ...(isPlainObject(sourceMeta) ? sourceMeta : {}),
      sourceType: "image",
      mimeType: String(mimeType || sourceMeta?.mimeType || ""),
    };

    const messages = [
      {
        role: "system",
        content: this.buildSystemPrompt(existingProduct, mergedMeta, provider),
      },
      {
        role: "user",
        content: this.buildImageContextPrompt(
          imageBuffer,
          mimeType,
          sourceText,
          mergedMeta,
          provider,
        ),
      },
    ];

    return this.requestJsonFromOpenAI(messages, "image");
  }

  normalizeProduct(draft = {}) {
    const base = sanitizeAiDraft(draft || {});
    const schema = buildSchemaTemplate();

    const asObject = (value) => (isPlainObject(value) ? { ...value } : {});
    const asArray = (value) => (Array.isArray(value) ? [...value] : []);
    const normalizeText = (value = "") =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim();
    const wordCount = (value = "") =>
      normalizeText(value).split(/\s+/).filter(Boolean).length;

    const detectPpeProductType = (value = "") => {
      const text = normalizeText(value).toLowerCase();
      if (!text) return "";

      if (/\bglove|gloves\b/.test(text)) return "gloves";
      if (/\bhelmet|hard hat\b/.test(text)) return "helmet";
      if (/\bsafety shoe|safety shoes|shoe|footwear|boot\b/.test(text))
        return "safety-shoes";
      if (/\blanyard\b/.test(text)) return "lanyard";
      if (/\bharness\b/.test(text)) return "harness";
      if (/\brespirator|mask\b/.test(text)) return "respirator";
      if (
        /\bear protection|earplug|ear plug|earmuff|hearing protection\b/.test(
          text,
        )
      )
        return "ear-protection";
      if (
        /\bfall arrest|lifeline|anchor line|fall protection accessory\b/.test(
          text,
        )
      )
        return "fall-protection-accessory";

      return "";
    };

    const PRODUCT_TYPE_TO_CATEGORY = {
      gloves: "hand-protection",
      helmet: "head-protection",
      "safety-shoes": "foot-protection",
      lanyard: "fall-protection",
      harness: "fall-protection",
      respirator: "respiratory-protection",
      "ear-protection": "hearing-protection",
      "fall-protection-accessory": "fall-protection",
    };

    const isGenericSafetySentence = (value = "") =>
      /\b(protection from falls|reduces? risk of injur(?:y|ies)|energy absorber helps absorb kinetic energy)\b/i.test(
        value,
      );

    const getFeaturePriority = (value = "") => {
      const text = String(value || "").toLowerCase();
      if (
        /fall|safety|shock|absorber|expansion|contraction|arrest|protection/.test(
          text,
        )
      ) {
        return 4;
      }

      if (
        /hook|carabiner|d-?ring|snap|sh-?60|easy\s*308|connector/.test(text)
      ) {
        return 3;
      }

      if (
        /application|construction|scaffold|tower|roof|industrial|maintenance|rescue|work-at-height/.test(
          text,
        )
      ) {
        return 2;
      }

      if (/compatib|harness|anchor/.test(text)) {
        return 1;
      }

      return 0;
    };

    const compressFeature = (value = "") => {
      const text = normalizeText(value).replace(/[.;,:]+$/g, "");
      if (!text) return "";

      const lower = text.toLowerCase();

      if (/expansion\s+and\s+contraction/.test(lower)) {
        return "Expansion and contraction feature";
      }

      if (
        /moving between anchor points|stay connected.*moving|continuous.*moving/.test(
          lower,
        )
      ) {
        return "Continuous fall protection while moving";
      }

      if (/lanyard length|free fall distance/.test(lower)) {
        return "Designed for fall arrest systems";
      }

      if (/compatible.*harness|full body harness/.test(lower)) {
        return "Compatible with full body harness";
      }

      if (
        /scaffolding hook|snap hook|carabiner|d-?ring|sh-?60|easy\s*308/.test(
          lower,
        )
      ) {
        return "";
      }

      if (wordCount(text) <= 8) {
        return text;
      }

      const words = text.split(/\s+/).filter(Boolean);
      const compact = words
        .slice(0, 16)
        .join(" ")
        .replace(/\b(and|or|to|for|with|while)$/i, "")
        .trim();
      return compact || words.slice(0, 16).join(" ");
    };

    const specifications = asObject(base.specifications);

    const specAliases = [
      ["Features", "features"],
      ["Material", "material"],
      ["Connectors", "connectors"],
      ["Dimensions", "dimensions"],
      ["PhysicalPerformance", "physical_performance"],
      ["Physical_Performance", "physical_performance"],
      ["ChemicalResistance", "chemical_resistance"],
      ["ComplianceFlags", "compliance_flags"],
      ["Standards", "standards"],
    ];

    for (const [fromKey, toKey] of specAliases) {
      if (
        specifications[fromKey] !== undefined &&
        specifications[toKey] === undefined
      ) {
        specifications[toKey] = specifications[fromKey];
      }
    }

    Object.keys(specifications).forEach((key) => {
      const lowerKey = String(key || "")
        .trim()
        .toLowerCase();
      if (!lowerKey || lowerKey === key) return;
      if (specifications[lowerKey] === undefined) {
        specifications[lowerKey] = specifications[key];
      }
      delete specifications[key];
    });

    if (
      Array.isArray(specifications.Features) &&
      !Array.isArray(specifications.features)
    ) {
      specifications.features = specifications.Features;
    }

    const material = asObject(specifications.material);
    const connectors = asObject(specifications.connectors);
    const dimensions = asObject(specifications.dimensions);
    const physicalPerformance = asObject(specifications.physical_performance);
    const chemicalResistance = asObject(specifications.chemical_resistance);
    const complianceFlags = asObject(specifications.compliance_flags);
    const standards = asArray(specifications.standards)
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    const rawFeatures = asArray(specifications.features)
      .map((item) => String(item || "").trim())
      .filter(Boolean);

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

    const normalizeUnitToken = (rawUnit = "") => {
      const token = String(rawUnit || "")
        .toLowerCase()
        .replace(/^\u00b0/, "")
        .replace(/[^a-z0-9]+/g, "");
      return numericUnitAliases[token] || token;
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

    const isMeasurementKey = (key = "") =>
      /(length|diameter|width|height|weight|strength|capacity|temperature|pressure)/.test(
        String(key || "").toLowerCase(),
      );

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

    const parseMeasurementText = (value = "") => {
      const text = normalizeText(value);
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

    const toCleanScalar = (value) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "boolean") return value;
      return normalizeText(value);
    };

    const normalizeMeasurementSection = (section = {}) => {
      if (!section || typeof section !== "object" || Array.isArray(section))
        return;

      const originalEntries = Object.entries({ ...section });
      const unitHintsByBase = new Map();

      originalEntries.forEach(([rawKey, rawValue]) => {
        const normalizedKey = String(rawKey || "")
          .trim()
          .toLowerCase();
        const unitHintMatch = normalizedKey.match(/^(.+)_unit$/);
        if (!unitHintMatch) return;

        const baseKey = sanitizeBaseKeyName(unitHintMatch[1]);
        const unitToken = normalizeUnitToken(rawValue);
        if (baseKey && unitToken && numericSuffixes.has(unitToken)) {
          unitHintsByBase.set(baseKey, unitToken);
        }
      });

      const nextSection = {};

      const setValue = (key, value) => {
        if (!key) return;
        if (value === "" || value === null || value === undefined) return;

        if (nextSection[key] === undefined) {
          nextSection[key] = value;
          return;
        }

        const existingValue = nextSection[key];
        const existingIsNumeric =
          typeof existingValue === "number" && Number.isFinite(existingValue);
        const incomingIsNumeric =
          typeof value === "number" && Number.isFinite(value);

        if (!existingIsNumeric && incomingIsNumeric) {
          nextSection[key] = value;
        }
      };

      originalEntries.forEach(([rawKey, rawValue]) => {
        const normalizedKey = String(rawKey || "")
          .trim()
          .toLowerCase();
        if (!normalizedKey || normalizedKey.endsWith("_unit")) return;

        const parenMatch = normalizedKey.match(
          /^(.+?)\(([a-z0-9_/%.\-\u00b0 ]+)\)$/i,
        );
        if (parenMatch) {
          const baseKey = sanitizeBaseKeyName(parenMatch[1]);
          const unitToken = normalizeUnitToken(parenMatch[2]);

          if (baseKey && unitToken && numericSuffixes.has(unitToken)) {
            const unitKey = buildUnitKey(baseKey, unitToken);
            const parsed = parseMeasurementText(rawValue);
            const numericValue = toNumberIfPossible(
              String(rawValue ?? "").trim(),
            );

            setValue(
              unitKey,
              numericValue !== undefined
                ? numericValue
                : parsed
                  ? parsed.number
                  : toCleanScalar(rawValue),
            );
            return;
          }
        }

        const suffixMatch = normalizedKey.match(/^(.+)_([a-z0-9]+)$/);
        if (suffixMatch && numericSuffixes.has(suffixMatch[2])) {
          const baseKey = sanitizeBaseKeyName(suffixMatch[1]);
          const unitToken = normalizeUnitToken(suffixMatch[2]);

          if (baseKey && unitToken && numericSuffixes.has(unitToken)) {
            const unitKey = buildUnitKey(baseKey, unitToken);
            const numericValue = toNumberIfPossible(
              String(rawValue ?? "").trim(),
            );
            setValue(
              unitKey,
              numericValue !== undefined
                ? numericValue
                : toCleanScalar(rawValue),
            );
            return;
          }
        }

        const baseKey = sanitizeBaseKeyName(normalizedKey);
        if (!baseKey) return;

        const parsed = parseMeasurementText(rawValue);
        const hintedUnit = unitHintsByBase.get(baseKey) || "";
        const unitToken = normalizeUnitToken(parsed?.unit || hintedUnit);

        if (
          unitToken &&
          numericSuffixes.has(unitToken) &&
          (isMeasurementKey(baseKey) || parsed)
        ) {
          const unitKey = buildUnitKey(baseKey, unitToken);
          if (parsed) {
            setValue(unitKey, parsed.number);
          } else {
            const numericValue = toNumberIfPossible(
              String(rawValue ?? "").trim(),
            );
            setValue(
              unitKey,
              numericValue !== undefined
                ? numericValue
                : toCleanScalar(rawValue),
            );
          }
          return;
        }

        setValue(baseKey, toCleanScalar(rawValue));
      });

      Object.keys(section).forEach((key) => {
        delete section[key];
      });

      Object.entries(nextSection).forEach(([key, value]) => {
        section[key] = value;
      });
    };

    const dedupeSimilarEntries = (section = {}) => {
      if (!section || typeof section !== "object" || Array.isArray(section))
        return;

      const seenByNormalizedValue = new Map();

      Object.keys(section).forEach((key) => {
        const value = section[key];
        if (typeof value !== "string") return;

        const normalizedValue = normalizeText(value)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
        if (!normalizedValue) return;

        const existingKey = seenByNormalizedValue.get(normalizedValue);
        if (!existingKey) {
          seenByNormalizedValue.set(normalizedValue, key);
          return;
        }

        const preferredKey =
          String(existingKey).length <= String(key).length ? existingKey : key;
        const dropKey = preferredKey === existingKey ? key : existingKey;

        delete section[dropKey];
        seenByNormalizedValue.set(normalizedValue, preferredKey);
      });

      // Remove near-duplicate strings where one value is just a generic subset
      // of a more specific value (e.g., "Scaffolding Hook" vs "SH-60 Scaffolding Hook").
      const entries = Object.entries(section)
        .filter(([, value]) => typeof value === "string")
        .map(([key, value]) => ({
          key,
          value,
          normalized: normalizeText(value)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim(),
        }))
        .filter((item) => item.normalized.length > 0);

      for (let index = 0; index < entries.length; index += 1) {
        for (
          let compareIndex = index + 1;
          compareIndex < entries.length;
          compareIndex += 1
        ) {
          const left = entries[index];
          const right = entries[compareIndex];
          if (!section[left.key] || !section[right.key]) continue;

          const leftContainsRight =
            left.normalized.includes(right.normalized) &&
            left.normalized !== right.normalized;
          const rightContainsLeft =
            right.normalized.includes(left.normalized) &&
            left.normalized !== right.normalized;

          if (!leftContainsRight && !rightContainsLeft) continue;

          const leftModelScore = /model/.test(left.key) ? 2 : 0;
          const rightModelScore = /model/.test(right.key) ? 2 : 0;
          const leftSpecificity = left.normalized.length + leftModelScore;
          const rightSpecificity = right.normalized.length + rightModelScore;

          if (leftSpecificity >= rightSpecificity) {
            delete section[right.key];
          } else {
            delete section[left.key];
          }
        }
      }
    };

    const hardwareKeywords =
      /\b(sh-?60|easy\s*308|scaffolding\s*hook|snap\s*hook|d-?ring|carabiner)\b/i;
    const incompleteFeature = /^(inspection|fall arrest)$/i;

    const isMaterialEmpty = (candidate = {}) => {
      const keys = Object.keys(asObject(candidate));
      if (keys.length === 0) {
        return true;
      }

      return keys.every((key) => {
        const value = candidate[key];
        if (value === null || value === undefined) return true;
        if (typeof value === "string") return !value.trim();
        if (Array.isArray(value)) return value.length === 0;
        if (isPlainObject(value)) return Object.keys(value).length === 0;
        return false;
      });
    };

    const recoverMaterialFromText = (text = "") => {
      const value = normalizeText(text);
      if (!value) return false;

      let found = false;

      const ropeMatch = value.match(/\b(polyester|polyamide|nylon)\s+rope\b/i);
      if (ropeMatch && !material.rope) {
        material.rope = `${String(ropeMatch[1] || "").toLowerCase()} rope`;
        found = true;
      }

      if (/\blatex\s+coating\b/i.test(value) && !material.coating) {
        material.coating = "latex coating";
        found = true;
      }

      if (/\bnitrile\s+coating\b/i.test(value) && !material.coating) {
        material.coating = "nitrile coating";
        found = true;
      }

      if (/\babs\s+shell\b/i.test(value) && !material.shell_material) {
        material.shell_material = "abs shell";
        found = true;
      }

      if (/\bleather\s+upper\b/i.test(value) && !material.upper_material) {
        material.upper_material = "leather upper";
        found = true;
      }

      if (/\bcotton\s+liner\b/i.test(value) && !material.liner_material) {
        material.liner_material = "cotton liner";
        found = true;
      }

      if (
        /\balloy\s+steel\s+carabiner\b/i.test(value) &&
        !material.carabiner_material
      ) {
        material.carabiner_material = "alloy steel";
        found = true;
      }

      if (/\bsteel\s+hook\b/i.test(value) && !material.hook_material) {
        material.hook_material = "steel";
        found = true;
      }

      const stitchingMatch =
        value.match(
          /\b(polyester|polyamide|nylon|nitrile|latex|cotton)\b.*\bstitching\s*thread\b/i,
        ) ||
        value.match(
          /\bstitching\s*thread\b.*\b(polyester|polyamide|nylon|nitrile|latex|cotton)\b/i,
        );

      if (stitchingMatch && !material.stitching_thread_material) {
        const materialToken = String(stitchingMatch[1] || "").toLowerCase();
        if (materialToken) {
          material.stitching_thread_material = `${materialToken} stitching thread`;
          found = true;
        }
      }

      if (
        /\bhigh\s+tenacity\s+virgin\s+multifilament\s+polyester\b/i.test(
          value,
        ) &&
        !material.stitching_thread_material
      ) {
        material.stitching_thread_material =
          "high tenacity virgin multifilament polyester";
        found = true;
      }

      return found;
    };

    const polishedFeatures = [];
    for (const feature of rawFeatures) {
      const value = normalizeText(feature);
      if (!value) continue;

      if (recoverMaterialFromText(value)) {
        continue;
      }

      if (hardwareKeywords.test(value)) {
        if (/sh-?60/i.test(value)) {
          connectors.hook_model = "SH-60 scaffolding hook";
        } else if (/scaffolding\s*hook/i.test(value) && !connectors.hook_type) {
          connectors.hook_type = "scaffolding hook";
        }

        if (/snap\s*hook/i.test(value) && !connectors.hook_type) {
          connectors.hook_type = "snap hook";
        }

        if (/easy\s*308/i.test(value)) {
          connectors.carabiner_model = "EASY 308 screw gate carabiner";
          connectors.carabiner_type =
            connectors.carabiner_type || "screw gate carabiner";
        } else if (/screw\s*gate\s*carabiner/i.test(value)) {
          connectors.carabiner_type = "screw gate carabiner";
        } else if (/carabiner/i.test(value) && !connectors.carabiner_type) {
          connectors.carabiner_type = "carabiner";
        }

        if (/d-?ring/i.test(value)) {
          connectors.d_ring = true;
        }

        continue;
      }

      const lengthMatch = value.match(
        /([0-9]+(?:\.[0-9]+)?)\s*(m|meter|mm|cm)\b/i,
      );
      if (lengthMatch) {
        const rawUnit = String(lengthMatch[2] || "").toLowerCase();
        const unit = rawUnit === "meter" ? "m" : rawUnit;
        if (!dimensions.lanyard_length) {
          dimensions.lanyard_length = `${lengthMatch[1]} ${unit}`;
        }
        if (
          (unit === "m" || unit === "meter") &&
          !dimensions.lanyard_length_m
        ) {
          dimensions.lanyard_length_m = String(lengthMatch[1]);
        }
        continue;
      }

      const perfMatch = value.match(/([0-9]+(?:\.[0-9]+)?)\s*(kN|kg|N)\b/i);
      if (perfMatch) {
        const unit = perfMatch[2];
        const perfValue = `${perfMatch[1]} ${unit}`;
        if (/kg/i.test(unit)) {
          physicalPerformance.weight = physicalPerformance.weight || perfValue;
        } else {
          physicalPerformance.breaking_strength =
            physicalPerformance.breaking_strength || perfValue;
        }
        continue;
      }

      if (incompleteFeature.test(value) || isGenericSafetySentence(value)) {
        continue;
      }

      let normalizedFeature = compressFeature(value);

      if (/\bfeature\s+th$/i.test(normalizedFeature)) {
        normalizedFeature = "Expansion and contraction feature";
      }

      if (isGenericSafetySentence(normalizedFeature)) {
        continue;
      }

      polishedFeatures.push(normalizedFeature);
    }

    if (isMaterialEmpty(material)) {
      const materialRecoverySources = [
        rawFeatures.join(". "),
        stringifyForPrompt(dimensions, 1400),
        normalizeText(base.name),
        normalizeText(base.description),
        normalizeText(base.short_description),
        normalizeText(base.product_text),
        normalizeText(base.productText),
        normalizeText(base.source_text),
        normalizeText(base.sourceText),
      ].filter(Boolean);

      for (const source of materialRecoverySources) {
        recoverMaterialFromText(source);
        if (!isMaterialEmpty(material)) {
          break;
        }
      }
    }

    if (connectors.hook_type && connectors.hook_model) {
      const hookType = normalizeText(connectors.hook_type);
      const hookModel = normalizeText(connectors.hook_model);
      if (hookType && hookModel) {
        if (!hookModel.toLowerCase().includes(hookType.toLowerCase())) {
          connectors.hook_model = `${hookModel} ${hookType}`;
        }
        delete connectors.hook_type;
      }
    }

    if (connectors.carabiner_type && connectors.carabiner_model) {
      const carabinerType = normalizeText(connectors.carabiner_type);
      const carabinerModel = normalizeText(connectors.carabiner_model);
      if (carabinerType && carabinerModel) {
        if (
          !carabinerModel.toLowerCase().includes(carabinerType.toLowerCase())
        ) {
          connectors.carabiner_model = `${carabinerModel} ${carabinerType}`;
        }
      }
    }

    const hasConnectorInfo = Object.entries(connectors).some(([, value]) => {
      if (typeof value === "string") return value.trim().length > 0;
      if (typeof value === "boolean") return value;
      if (Array.isArray(value)) return value.length > 0;
      if (isPlainObject(value)) return Object.keys(value).length > 0;
      return false;
    });

    const materialFeaturePattern =
      /\b(polyester|polyamide|nylon|latex coating|nitrile coating|abs shell|leather upper|cotton liner|material)\b/i;
    const connectorFeaturePattern =
      /\b(connector|hook|scaffolding hook|snap hook|carabiner|screw gate|d-?ring|sh-?60|easy\s*308|secure anchoring)\b/i;
    const marketingFeaturePattern =
      /\b(premium|high quality|best quality|world class|ideal for|advanced technology|superior)\b/i;

    const productSignalText = [
      normalizeText(base.name),
      normalizeText(base.description),
      normalizeText(base.short_description),
      normalizeText(base.product_text),
      normalizeText(base.source_text),
      normalizeText(rawFeatures.join(" ")),
    ]
      .filter(Boolean)
      .join(" ");
    const detectedProductType = detectPpeProductType(productSignalText);
    const inferredCategoryFromType =
      PRODUCT_TYPE_TO_CATEGORY[detectedProductType] || "";

    const features = [...new Set(polishedFeatures)]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .map((feature) => {
        if (/optimized lanyard length for safety/i.test(feature)) {
          return "Designed for fall arrest systems";
        }
        return feature;
      })
      .filter((feature) => !materialFeaturePattern.test(feature))
      .filter(
        (feature) =>
          !hasConnectorInfo || !connectorFeaturePattern.test(feature),
      )
      .filter((feature) => !marketingFeaturePattern.test(feature))
      .map((feature, index) => ({
        feature,
        index,
        priority: getFeaturePriority(feature),
      }))
      .sort((a, b) => b.priority - a.priority || a.index - b.index)
      .slice(0, 12)
      .map((item) => item.feature);

    const variants = asArray(base.variants)
      .map((item) => {
        const variant = asObject(item);
        return {
          model: String(variant.model || "").trim(),
          size: String(variant.size || "").trim(),
          color: String(variant.color || "").trim(),
          details: asObject(variant.details),
        };
      })
      .filter(
        (variant) =>
          variant.model ||
          variant.size ||
          variant.color ||
          Object.keys(variant.details).length > 0,
      );

    if (variants.length === 0) {
      variants.push({ model: "", size: "", color: "", details: {} });
    }

    const lanyardLengthValue = dimensions.lanyard_length;
    const lanyardLengthText = normalizeText(lanyardLengthValue);
    const lanyardLengthUnit = normalizeText(dimensions.lanyard_length_unit);

    if (lanyardLengthText && lanyardLengthUnit && !variants[0].size) {
      const lowerText = lanyardLengthText.toLowerCase();
      const lowerUnit = lanyardLengthUnit.toLowerCase();
      const alreadyContainsUnit =
        lowerText.includes(lowerUnit) ||
        /\b(m|mm|cm|kg|kn|n|kpa|pa|bar|psi|mpa)\b/.test(lowerText);

      variants[0].size = alreadyContainsUnit
        ? lanyardLengthText
        : `${lanyardLengthText} ${lanyardLengthUnit}`;
    }

    const lanyardLengthM = normalizeText(dimensions.lanyard_length_m);
    if (lanyardLengthM && !variants[0].size) {
      const numericPart = lanyardLengthM.match(/[0-9]+(?:\.[0-9]+)?/);
      if (numericPart) {
        variants[0].size = `${numericPart[0]} m`;
      } else {
        variants[0].size = /\bm\b/i.test(lanyardLengthM)
          ? lanyardLengthM
          : `${lanyardLengthM} m`;
      }
    } else if (lanyardLengthText && !variants[0].size) {
      variants[0].size = lanyardLengthText;
    }

    // Collapse legacy duplicate unit fields into a single key(unit) format.
    normalizeMeasurementSection(dimensions);
    normalizeMeasurementSection(physicalPerformance);

    // Remove repeated text entries produced by legacy extraction behavior.
    dedupeSimilarEntries(connectors);
    dedupeSimilarEntries(dimensions);
    dedupeSimilarEntries(physicalPerformance);

    // Connectors must stay in connectors section, not inside material.
    delete material.hook_model;
    delete material.hook_type;
    delete material.carabiner_model;
    delete material.carabiner_type;
    delete material.d_ring;
    delete material.d_ring_model;

    // Keep one canonical rope key.
    if (material.rope_material && !material.rope) {
      material.rope = material.rope_material;
    }
    delete material.rope_material;

    const toLowercaseObjectKeys = (section = {}) =>
      Object.fromEntries(
        Object.entries(asObject(section)).map(([rawKey, rawValue]) => [
          String(rawKey || "")
            .trim()
            .toLowerCase(),
          rawValue,
        ]),
      );

    const capitalizeAlphabeticStart = (value = "") => {
      const text = normalizeText(value);
      if (!text) return "";

      // Preserve values that are already fully uppercase/number/symbol based.
      if (!/[a-z]/.test(text)) {
        return text;
      }

      const chars = Array.from(text);
      for (let index = 0; index < chars.length; index += 1) {
        if (/[a-zA-Z]/.test(chars[index])) {
          chars[index] = chars[index].toUpperCase();
          break;
        }
      }

      return chars.join("");
    };

    const capitalizeValuesDeep = (value) => {
      if (typeof value === "string") {
        return capitalizeAlphabeticStart(value);
      }

      if (Array.isArray(value)) {
        return value.map((item) => capitalizeValuesDeep(item));
      }

      if (isPlainObject(value)) {
        return Object.fromEntries(
          Object.entries(value).map(([key, nestedValue]) => [
            key,
            capitalizeValuesDeep(nestedValue),
          ]),
        );
      }

      return value;
    };

    const normalizedMaterial = capitalizeValuesDeep(
      toLowercaseObjectKeys(material),
    );
    const normalizedConnectors = capitalizeValuesDeep(
      toLowercaseObjectKeys(connectors),
    );
    const normalizedDimensions = capitalizeValuesDeep(
      toLowercaseObjectKeys(dimensions),
    );
    const normalizedPhysicalPerformance = capitalizeValuesDeep(
      toLowercaseObjectKeys(physicalPerformance),
    );
    const normalizedChemicalResistance = capitalizeValuesDeep(
      toLowercaseObjectKeys(chemicalResistance),
    );
    const normalizedComplianceFlags = capitalizeValuesDeep(
      toLowercaseObjectKeys(complianceFlags),
    );

    const normalizedFeatures = asArray(features)
      .map((item) => capitalizeAlphabeticStart(item))
      .filter(Boolean);

    const normalizedStandards = [...new Set(standards)]
      .map((item) => capitalizeAlphabeticStart(item))
      .filter(Boolean);

    const normalizedVariants = asArray(variants).map((variant) => ({
      model: capitalizeAlphabeticStart(variant.model),
      size: capitalizeAlphabeticStart(variant.size),
      color: capitalizeAlphabeticStart(variant.color),
      details: capitalizeValuesDeep(asObject(variant.details)),
    }));

    const merged = {
      ...schema,
      ...base,
      sku: String(base.sku || "").trim(),
      name: capitalizeAlphabeticStart(String(base.name || "").trim()),
      slug: String(base.slug || "").trim(),
      brand: capitalizeAlphabeticStart(String(base.brand || "").trim()),
      category: normalizeCategory(
        base.category ||
          inferredCategoryFromType ||
          inferCategoryFromText(productSignalText) ||
          schema.category,
      ),
      hsn: String(base.hsn || "").trim(),
      tax: {
        gst_rate:
          base?.tax?.gst_rate !== undefined
            ? toNumberIfPossible(base.tax.gst_rate, DEFAULT_GST_RATE)
            : DEFAULT_GST_RATE,
      },
      pricing: {
        price_type: String(base?.pricing?.price_type || DEFAULT_PRICE_TYPE),
        display_label: capitalizeAlphabeticStart(
          String(base?.pricing?.display_label || DEFAULT_PRICE_LABEL),
        ),
      },
      active: typeof base.active === "boolean" ? base.active : true,
      certification: asArray(base.certification)
        .map((item) => capitalizeAlphabeticStart(String(item || "").trim()))
        .filter(Boolean),
      specifications: {
        material: normalizedMaterial,
        connectors: normalizedConnectors,
        features: normalizedFeatures,
        dimensions: normalizedDimensions,
        physical_performance: normalizedPhysicalPerformance,
        chemical_resistance: normalizedChemicalResistance,
        standards: normalizedStandards,
        compliance_flags: normalizedComplianceFlags,
      },
      variants: normalizedVariants,
      images: asArray(base.images)
        .map((item) => String(item || "").trim())
        .filter(Boolean),
      datasheet: String(base.datasheet || "").trim(),
    };

    if (!merged.slug) {
      merged.slug = toSlug(merged.name || merged.sku || "");
    }

    if (!merged.sku) {
      const modelFromVariant = variants[0]?.model || "";
      const productType = String(merged.name || "")
        .trim()
        .split(/\s+/)
        .slice(-2)
        .join("-");
      merged.sku = toSku(
        [merged.brand, modelFromVariant, productType].filter(Boolean).join("-"),
      );
    }

    return merged;
  }

  async cleanAndNormalizeDraft(draft = {}, provider = null) {
    const normalized = this.normalizeProduct(draft);
    return normalized;
  }

  async generateDraftFromTextWithRetries(
    sourceText = "",
    existingProduct = {},
    sourceMeta = {},
    aiProvider = null,
  ) {
    const maxAttempts = this.getAiRetryAttempts();
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.generateDraftFromText(
          sourceText,
          existingProduct,
          sourceMeta,
          aiProvider,
        );
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts) {
          await delay(Math.min(10000, 1500 * attempt));
        }
      }
    }

    throw lastError || createHttpError(502, "AI parsing failed after retries.");
  }

  async requestJsonFromOpenAI(messages = [], sourceType = "text") {
    const client = this.getOpenAIClient();
    if (!client) {
      throw createHttpError(
        400,
        "OPENAI_API_KEY is required for OpenAI generation",
      );
    }

    const model = this.getPreferredOpenAIModel(sourceType);
    const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 800;
    const temperature = 0;
    const usesCompletionTokens = /^gpt-5(?:$|[-.])/i.test(model);

    const runCompletion = async (
      requestMessages = messages,
      requestMaxTokens = maxTokens,
      useJsonMode = true,
      allowLengthRetry = true,
    ) => {
      const buildLengthRetryMessages = (inputMessages = []) =>
        inputMessages.map((message) => {
          if (!message || typeof message !== "object") {
            return message;
          }

          if (typeof message.content !== "string") {
            return message;
          }

          const text = String(message.content || "");
          const beginMarker = "═══ SOURCE CONTENT BEGIN ═══";
          const endMarker = "═══ SOURCE CONTENT END ═══";
          const beginIndex = text.indexOf(beginMarker);
          const endIndex = text.indexOf(endMarker);

          // Compact only the extracted source block to reduce completion pressure.
          if (beginIndex !== -1 && endIndex > beginIndex) {
            const sourceStart = beginIndex + beginMarker.length;
            const before = text.slice(0, sourceStart);
            const sourceBody = text.slice(sourceStart, endIndex);
            const after = text.slice(endIndex);

            const compactSourceLimit = Math.min(
              Math.max(1200, this.getAiSourceTextChars()),
              2500,
            );

            return {
              ...message,
              content: `${before}\n${trimTo(sourceBody, compactSourceLimit)}\n${after}`,
            };
          }

          return {
            ...message,
            content: trimTo(text, 4500),
          };
        });

      const payload = {
        model,
        messages: requestMessages,
      };

      if (!usesCompletionTokens) {
        payload.temperature = temperature;
      }

      if (usesCompletionTokens) {
        payload.max_completion_tokens = requestMaxTokens;
      } else {
        payload.max_tokens = requestMaxTokens;
      }

      if (useJsonMode) {
        payload.response_format = { type: "json_object" };
      }

      const completion = await client.chat.completions.create(payload);
      const choice = completion?.choices?.[0] || {};
      const finishReason = choice.finish_reason;
      const refusal = choice.message?.refusal;
      const rawApiContent = choice.message?.content;
      const content = extractAssistantTextContent(rawApiContent);
      const trimmedContent = String(content || "").trim();

      const retryIfLengthLimited = async (reason = "") => {
        if (!allowLengthRetry) {
          return null;
        }

        if (finishReason !== "length") {
          return null;
        }

        const retryMaxTokens = this.getOpenAiRetryMaxTokens(requestMaxTokens);
        if (
          !Number.isFinite(retryMaxTokens) ||
          retryMaxTokens <= requestMaxTokens
        ) {
          return null;
        }

        console.warn(
          `[AI_DRAFT] ${reason || "Token-limited response"}. Retrying once with higher token budget (${requestMaxTokens} -> ${retryMaxTokens}) and compacted source text.`,
        );

        const compactedMessages = buildLengthRetryMessages(requestMessages);
        return runCompletion(
          compactedMessages,
          retryMaxTokens,
          useJsonMode,
          false,
        );
      };

      // Log diagnostics to help trace issues
      if (!trimmedContent || !trimmedContent.startsWith("{")) {
        console.error(
          `[AI_DRAFT_DIAG] model=${model} sourceType=${sourceType} jsonMode=${useJsonMode}` +
            ` finishReason=${finishReason} refusal=${!!refusal}` +
            ` contentIsNull=${rawApiContent === null} contentLen=${trimmedContent.length}` +
            ` contentPreview="${trimmedContent.slice(0, 80).replace(/\n/g, " ")}"`,
        );
      }

      // If model refused the request (safety, policy, etc.)
      if (refusal) {
        throw createHttpError(502, `GPT model refused the request: ${refusal}`);
      }

      // If response was truncated due to token limit
      if (finishReason === "length") {
        console.warn(
          `[AI_DRAFT] Token limit hit (${requestMaxTokens} tokens). JSON may be truncated. Consider increasing OPENAI_MAX_TOKENS.`,
        );
      }

      // If content is empty, throw clearly
      if (!trimmedContent) {
        const lengthRetryResult = await retryIfLengthLimited(
          "GPT returned empty content with finish_reason=length",
        );
        if (lengthRetryResult) {
          return lengthRetryResult;
        }

        throw createHttpError(
          502,
          `GPT model returned empty response (finish_reason=${finishReason}). Increase OPENAI_MAX_TOKENS/OPENAI_RETRY_MAX_TOKENS or reduce source text size.`,
        );
      }

      // For non-json-mode fallback: try to extract JSON from any response text
      if (!useJsonMode && !trimmedContent.startsWith("{")) {
        const jsonMatch = trimmedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const draft = await this.parseOpenAiDraftContent(
            jsonMatch[0],
            model,
            sourceType,
            requestMaxTokens,
          );
          return { draft, model, provider: AI_PROVIDER_OPENAI };
        }

        const lengthRetryResult = await retryIfLengthLimited(
          "Non-JSON fallback output appears token-limited",
        );
        if (lengthRetryResult) {
          return lengthRetryResult;
        }

        throw createHttpError(
          502,
          `GPT returned non-JSON text in fallback mode. Ensure system prompt includes JSON-only instruction. Got: "${trimmedContent.slice(0, 60)}"`,
        );
      }

      // For json-mode: content should start/end with braces
      if (
        useJsonMode &&
        (!trimmedContent.startsWith("{") || !trimmedContent.endsWith("}"))
      ) {
        // Try to extract embedded JSON
        const jsonMatch = trimmedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const draft = await this.parseOpenAiDraftContent(
            jsonMatch[0],
            model,
            sourceType,
            requestMaxTokens,
          );
          return { draft, model, provider: AI_PROVIDER_OPENAI };
        }

        const lengthRetryResult = await retryIfLengthLimited(
          "JSON-mode output appears token-limited",
        );
        if (lengthRetryResult) {
          return lengthRetryResult;
        }

        throw createHttpError(
          502,
          `GPT returned non-JSON despite response_format:json_object. Got: "${trimmedContent.slice(0, 60)}"`,
        );
      }

      const draft = await this.parseOpenAiDraftContent(
        content,
        model,
        sourceType,
        requestMaxTokens,
      );

      return {
        draft,
        model,
        provider: AI_PROVIDER_OPENAI,
      };
    };

    try {
      return await runCompletion(messages, maxTokens, true);
    } catch (error) {
      if (isResponseFormatCompatibilityError(error)) {
        console.warn(
          `[AI_DRAFT] response_format not supported for model ${model}, retrying without JSON mode.`,
        );
        return runCompletion(messages, maxTokens, false);
      }

      throw error;
    }
  }

  async requestJsonFromOllama(messages = [], sourceType = "text") {
    // requestJsonFromOllama method removed - Ollama integration no longer used
  }
  async generateDraft({
    sourceText = "",
    sourceFile = null,
    existingProduct = {},
  }) {
    const warnings = [];
    let workingText = trimTo(sourceText, MAX_TEXT_CHARS);
    let sourceType = "text";
    let model = null;
    let provider = "";
    let usedOCR = false;
    const sourceMeta = {
      sourceType: "text",
      fileName: sourceFile?.originalname || "",
      mimeType: sourceFile?.mimetype || "",
    };

    if (sourceFile) {
      const mimeType = String(sourceFile.mimetype || "").toLowerCase();

      if (mimeType.startsWith("image/")) {
        sourceType = "image";
      } else if (mimeType === "application/pdf") {
        sourceType = "pdf";
        const extractedPdfText = await this.extractTextFromPdfBuffer(
          sourceFile.buffer,
        );
        workingText = trimTo(
          `${extractedPdfText}\n\n${workingText}`.trim(),
          MAX_TEXT_CHARS,
        );
      } else {
        sourceType = "text-file";
        const extractedText = this.decodeTextFile(sourceFile.buffer);
        workingText = trimTo(
          `${extractedText}\n\n${workingText}`.trim(),
          MAX_TEXT_CHARS,
        );
      }

      sourceMeta.sourceType = sourceType;
    }

    const configuredProvider = this.getConfiguredAiProvider();
    const aiProvider = this.resolveActiveAiProvider();
    const strictAiMode = this.isAiStrictModeEnabled();
    let bypassStrictFallback = false;

    if (sourceType === "image") {
      let imageDraft = null;
      let usedAI = false;

      const applyImageOcrFallback = async (warningPrefix = "") => {
        try {
          const ocrText = await this.extractTextFromImageBuffer(
            sourceFile.buffer,
          );
          if (ocrText) {
            usedOCR = true;
            workingText = trimTo(
              `${ocrText}\n\n${workingText}`.trim(),
              MAX_TEXT_CHARS,
            );
            const prefix = warningPrefix ? `${warningPrefix} ` : "";
            warnings.push(
              `${prefix}Used tesseract.js OCR for image text extraction.`,
            );
          } else {
            warnings.push(
              "Image OCR did not detect enough readable text. Add manual source text for better JSON quality.",
            );
          }
        } catch (error) {
          warnings.push(
            `Image OCR failed (${error.message}). Add manual source text for better JSON quality.`,
          );
        }
      };

      if (aiProvider === AI_PROVIDER_OPENAI) {
        // OCR-first: extract text from image, then use text model.
        // This avoids expensive vision/image tokens and works well for product packaging.
        try {
          const ocrText = await this.extractTextFromImageBuffer(
            sourceFile.buffer,
          );
          if (ocrText) {
            usedOCR = true;
            workingText = trimTo(
              `${ocrText}\n\n${workingText}`.trim(),
              MAX_TEXT_CHARS,
            );
          } else {
            warnings.push(
              "Image OCR did not detect enough readable text. Add manual source text for better JSON quality.",
            );
          }
        } catch (ocrError) {
          warnings.push(
            `Image OCR failed (${ocrError.message}). Add manual source text for better JSON quality.`,
          );
        }
      } else {
        await applyImageOcrFallback();

        if (!aiProvider) {
          warnings.push(
            "No AI provider is configured. Configure OPENAI_API_KEY for AI extraction.",
          );
        }
      }

      if (!imageDraft && workingText && aiProvider) {
        try {
          const aiInputText = trimTo(
            workingText,
            this.getAiSourceTextChars(aiProvider),
          );

          const aiResult = await this.generateDraftFromTextWithRetries(
            aiInputText,
            existingProduct,
            sourceMeta,
            aiProvider,
          );

          imageDraft = mergeDrafts(
            aiResult.draft,
            buildHeuristicDraft(workingText, existingProduct, {
              includeSourceTextFallback: false,
            }),
          );
          model = aiResult.model;
          provider = aiResult.provider || aiProvider;
          usedAI = true;
        } catch (error) {
          const isConnectionIssue = isAiConnectivityError(error);
          if (strictAiMode && !isConnectionIssue) {
            throw createHttpError(
              error?.statusCode || 502,
              `AI parsing failed (${error.message}). AI_REQUIRE_SUCCESS is enabled, so fallback parser is disabled.`,
            );
          }

          if (strictAiMode && isConnectionIssue) {
            bypassStrictFallback = true;
            warnings.push(
              buildAiFallbackWarning(error, { connectionIssue: true }),
            );
          } else {
            warnings.push(buildAiFallbackWarning(error));
          }
        }
      }

      if (!imageDraft) {
        if (strictAiMode && aiProvider && !bypassStrictFallback) {
          throw createHttpError(
            502,
            "AI draft generation did not complete. AI_REQUIRE_SUCCESS is enabled, so heuristic fallback is disabled.",
          );
        }

        const imageFileContext = sourceFile?.originalname
          ? `Image file: ${sourceFile.originalname}`
          : "";
        const fallbackText = trimTo(
          [workingText, imageFileContext].filter(Boolean).join("\n\n"),
          MAX_TEXT_CHARS,
        );
        imageDraft = buildHeuristicDraft(fallbackText, existingProduct);
      }

      // Always clean and normalize the image draft
      if (imageDraft) {
        try {
          imageDraft = await this.cleanAndNormalizeDraft(imageDraft, provider);
        } catch (error) {
          warnings.push(
            `Draft cleaning failed (${error.message}). Using uncleaned draft.`,
          );
          // Even if AI cleaning fails, apply basic normalization
          imageDraft = this.normalizeProduct(imageDraft);
        }
      }

      return {
        sourceType,
        usedAI,
        usedOCR,
        model,
        provider,
        draft: imageDraft,
        textLength: workingText.length,
        warnings,
      };
    }

    if (!workingText) {
      throw createHttpError(
        400,
        "No readable text found. Please upload a text-based PDF, text file, or paste text.",
      );
    }

    let draft = null;
    let usedAI = false;

    if (aiProvider) {
      try {
        const aiInputText = trimTo(
          workingText,
          this.getAiSourceTextChars(aiProvider),
        );

        const aiResult = await this.generateDraftFromTextWithRetries(
          aiInputText,
          existingProduct,
          sourceMeta,
          aiProvider,
        );
        draft = mergeDrafts(
          aiResult.draft,
          buildHeuristicDraft(workingText, existingProduct, {
            includeSourceTextFallback: false,
          }),
        );
        model = aiResult.model;
        provider = aiResult.provider || aiProvider;
        usedAI = true;
      } catch (error) {
        const isConnectionIssue = isAiConnectivityError(error);
        if (strictAiMode && !isConnectionIssue) {
          throw createHttpError(
            error?.statusCode || 502,
            `AI parsing failed (${error.message}). AI_REQUIRE_SUCCESS is enabled, so fallback parser is disabled.`,
          );
        }

        if (strictAiMode && isConnectionIssue) {
          bypassStrictFallback = true;
          warnings.push(
            buildAiFallbackWarning(error, { connectionIssue: true }),
          );
        } else {
          warnings.push(buildAiFallbackWarning(error));
        }
      }
    } else {
      warnings.push(
        `No AI provider is configured (AI_PROVIDER=${configuredProvider}). Draft was generated using heuristic parsing, which is less accurate than AI extraction.`,
      );
    }

    if (!draft) {
      if (strictAiMode && aiProvider && !bypassStrictFallback) {
        throw createHttpError(
          502,
          "AI draft generation did not complete. AI_REQUIRE_SUCCESS is enabled, so heuristic fallback is disabled.",
        );
      }

      draft = buildHeuristicDraft(workingText, existingProduct);
    }

    // Always clean and normalize the draft
    if (draft) {
      try {
        draft = await this.cleanAndNormalizeDraft(draft, provider);
      } catch (error) {
        warnings.push(
          `Draft cleaning failed (${error.message}). Using uncleaned draft.`,
        );
        // Even if AI cleaning fails, apply basic normalization
        draft = this.normalizeProduct(draft);
      }
    }

    return {
      sourceType,
      usedAI,
      usedOCR,
      model,
      provider,
      draft,
      textLength: workingText.length,
      warnings,
    };
  }
}

module.exports = new ProductDraftService();
