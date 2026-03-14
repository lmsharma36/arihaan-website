const CATEGORY_ALIASES = {
  "head hearing protection": "head-hearing-protection",
  "head and hearing protection": "head-hearing-protection",
  "eye face protection": "eye-face-protection",
  "eye and face protection": "eye-face-protection",
  "respiratory protection": "respiratory-protection",
  "hand arm protection": "hand-arm-protection",
  "hand and arm protection": "hand-arm-protection",
  "protective clothing": "protective-clothing",
  "safety footwear": "safety-footwear",
  "fall protection": "fall-protection",
  "traffic safety signage": "traffic-safety-signage",
  "traffic safety & signage": "traffic-safety-signage",
  "confined space equipment": "confined-space-equipment",
  "fire safety": "fire-safety",
  "hand protection": "hand-arm-protection",
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
};

const pickFirst = (object, keys, fallback = undefined) => {
  for (const key of keys) {
    if (object?.[key] !== undefined && object?.[key] !== null) {
      return object[key];
    }
  }
  return fallback;
};

const toNumber = (value, fallback = 0) => {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const parsed = Number(cleaned);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
};

const parseBooleanLike = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "active"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "inactive"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
};

const slugifyCategory = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const normalizeCategory = (rawCategory) => {
  if (!rawCategory) return "";

  if (typeof rawCategory === "object") {
    const nestedValue =
      rawCategory.slug ||
      rawCategory.id ||
      rawCategory.name ||
      rawCategory.title ||
      "";
    return normalizeCategory(nestedValue);
  }

  const categoryValue = String(rawCategory).trim();
  if (categoryValue.includes("-")) {
    const normalized = categoryValue.toLowerCase();
    const aliasFromHyphen = CATEGORY_ALIASES[normalized.replace(/-/g, " ")];
    return aliasFromHyphen || normalized;
  }

  const aliasKey = categoryValue.toLowerCase().replace(/&/g, "&").trim();
  if (CATEGORY_ALIASES[aliasKey]) return CATEGORY_ALIASES[aliasKey];

  const bySlug = slugifyCategory(categoryValue).replace(/-and-/g, "-");
  return CATEGORY_ALIASES[bySlug.replace(/-/g, " ")] || bySlug;
};

const normalizeImages = (rawProduct) => {
  const candidates = [
    rawProduct?.images,
    rawProduct?.imageUrls,
    rawProduct?.gallery,
    rawProduct?.media?.images,
    rawProduct?.media?.gallery,
    rawProduct?.media?.photos,
    rawProduct?.media?.files,
  ];

  const rawImages = candidates.find((item) => Array.isArray(item)) || [];

  const mapped = rawImages
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        return item.url || item.path || item.src || item.location || "";
      }
      return "";
    })
    .filter(Boolean);

  if (mapped.length > 0) return mapped;

  const singleImage = pickFirst(rawProduct, [
    "mainImage",
    "featuredImage",
    "thumbnail",
    "image",
    "imageUrl",
  ]);

  return singleImage ? [singleImage] : [];
};

const normalizeCertifications = (rawProduct) => {
  const value = pickFirst(rawProduct, [
    "certification",
    "certifications",
    "certificates",
  ]);

  return asArray(value)
    .map((item) =>
      typeof item === "string" ? item : item?.name || item?.title,
    )
    .filter(Boolean);
};

const normalizeSpecifications = (rawProduct) => {
  const value = pickFirst(rawProduct, [
    "specifications",
    "specs",
    "attributes",
  ]);

  if (!value) return {};

  if (Array.isArray(value)) {
    return value.reduce((acc, item, index) => {
      if (item && typeof item === "object") {
        const key = item.key || item.name || item.label || `Spec ${index + 1}`;
        const val = item.value || item.description || item.detail || "";
        if (val !== "") acc[key] = val;
      }
      return acc;
    }, {});
  }

  if (typeof value === "object") return value;

  return {};
};

const normalizeVariantEntry = (entry, index) => {
  if (entry == null) return null;

  if (typeof entry === "string" || typeof entry === "number") {
    const label = String(entry).trim();
    return label ? { label } : null;
  }

  if (typeof entry !== "object" || Array.isArray(entry)) return null;

  const extractTextFromNumericKeys = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";

    const numericParts = Object.keys(value)
      .filter((key) => /^\d+$/.test(key))
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => String(value[key] ?? "").trim())
      .filter(Boolean);

    return numericParts.join("");
  };

  const numericTopLevelText = extractTextFromNumericKeys(entry);
  const numericDetailsText = extractTextFromNumericKeys(entry.details);
  const compactSizeText = numericTopLevelText || numericDetailsText;

  if (compactSizeText) {
    return {
      size: compactSizeText,
      label: compactSizeText,
    };
  }

  const labelCandidate =
    entry.label ||
    entry.model ||
    entry.name ||
    entry.size ||
    entry.capacity ||
    entry.color ||
    `Variant ${index + 1}`;

  return {
    ...entry,
    label: String(labelCandidate).trim(),
  };
};

const extractVariants = (rawProduct, normalizedSpecifications) => {
  const directVariants = asArray(rawProduct?.variants)
    .map((variant, index) => normalizeVariantEntry(variant, index))
    .filter(Boolean);

  if (directVariants.length > 0) {
    return {
      variants: directVariants,
      specifications: normalizedSpecifications,
      variantSource: "direct",
    };
  }

  const models = normalizedSpecifications?.models;
  if (!Array.isArray(models) || models.length === 0) {
    return {
      variants: [],
      specifications: normalizedSpecifications,
      variantSource: "none",
    };
  }

  const derivedVariants = models
    .map((variant, index) => normalizeVariantEntry(variant, index))
    .filter(Boolean);

  const { models: _removedModels, ...specificationsWithoutModels } =
    normalizedSpecifications;

  return {
    variants: derivedVariants,
    specifications: specificationsWithoutModels,
    variantSource: derivedVariants.length > 0 ? "models" : "none",
  };
};

export const normalizeProduct = (rawProduct = {}) => {
  const id =
    pickFirst(rawProduct, ["_id", "id", "productId", "sku", "slug"]) || "";

  const name =
    pickFirst(rawProduct, ["name", "title", "productName", "product_title"]) ||
    "Unnamed Product";

  const description =
    pickFirst(rawProduct, [
      "description",
      "shortDescription",
      "productDescription",
      "details",
      "summary",
    ]) || "";

  const brand =
    pickFirst(rawProduct, ["brand", "brandName", "manufacturer", "make"]) || "";

  const category = normalizeCategory(
    pickFirst(rawProduct, [
      "category",
      "categorySlug",
      "categoryId",
      "productCategory",
    ]),
  );

  const rawPrice = pickFirst(rawProduct, [
    "price",
    "sellingPrice",
    "unitPrice",
    "mrp",
    "basePrice",
  ]);

  const pricingPrice = rawProduct?.pricing?.price;

  const price = toNumber(rawPrice ?? pricingPrice, 0);

  const stockValue = pickFirst(rawProduct, [
    "stock",
    "quantity",
    "stockQty",
    "availableStock",
  ]);
  const stock =
    stockValue === undefined || stockValue === null
      ? null
      : toNumber(stockValue, 0);

  const pricing = rawProduct.pricing || {};
  const priceType = pricing.price_type || rawProduct.priceType || "";
  const priceLabel =
    pricing.display_label ||
    rawProduct.priceLabel ||
    (priceType === "price_on_request" ? "Price on Request" : "");

  const gstRate =
    toNumber(rawProduct?.tax?.gst_rate, NaN) ||
    toNumber(rawProduct?.gstRate, NaN) ||
    null;

  const normalizedSpecifications = normalizeSpecifications(rawProduct);
  const { variants, specifications, variantSource } = extractVariants(
    rawProduct,
    normalizedSpecifications,
  );

  const variantSizes = variants
    .map(
      (variant) =>
        variant?.size ||
        variant?.label ||
        variant?.model ||
        variant?.name ||
        "",
    )
    .filter(Boolean);

  const isActive = parseBooleanLike(
    pickFirst(rawProduct, ["active", "isActive", "status"]),
    true,
  );

  const images = normalizeImages(rawProduct);

  const datasheet =
    pickFirst(rawProduct, [
      "datasheet",
      "datasheetUrl",
      "pdf",
      "pdfUrl",
      "documents",
    ]) || "";

  const mediaDatasheet =
    rawProduct?.media?.datasheet ||
    rawProduct?.media?.brochure ||
    rawProduct?.media?.document ||
    rawProduct?.media?.pdf ||
    "";

  const datasheetUrl =
    typeof (mediaDatasheet || datasheet) === "object"
      ? (mediaDatasheet || datasheet).url ||
        (mediaDatasheet || datasheet).path ||
        (mediaDatasheet || datasheet).datasheet ||
        ""
      : mediaDatasheet || datasheet;

  return {
    ...rawProduct,
    _id: rawProduct._id || id,
    id,
    name,
    description,
    brand,
    category,
    price,
    stock,
    isActive,
    images,
    mainImage: images[0] || rawProduct.mainImage || "",
    datasheet: datasheetUrl,
    hsn: rawProduct.hsn || "",
    gstRate,
    variants,
    variantSizes,
    variantSource,
    priceType,
    priceLabel,
    hasNumericPrice:
      (rawPrice !== undefined && rawPrice !== null && price > 0) ||
      (pricingPrice !== undefined && pricingPrice !== null && price > 0),
    seo: rawProduct.seo || {},
    certification: normalizeCertifications(rawProduct),
    specifications,
  };
};

export const extractProductsFromResponse = (payload = {}) => {
  const list =
    payload.products ||
    payload.docs ||
    payload.rows ||
    payload.results ||
    payload.items ||
    payload.data?.docs ||
    payload.data?.rows ||
    payload.data?.results ||
    payload.data?.products ||
    payload.data?.items ||
    payload.data ||
    [];

  if (Array.isArray(list)) return list;
  if (list && typeof list === "object") {
    const values = Object.values(list);
    if (values.length > 0) return values;
  }

  return [];
};

export const extractSingleProductFromResponse = (payload = {}) =>
  payload.product ||
  payload.item ||
  payload.data?.product ||
  payload.data ||
  null;
