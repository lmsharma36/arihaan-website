const extractProductComponents = (fullName = "", brand = "") => {
  if (!fullName) return { brand: "", model: "", productType: "" };

  const cleanName = String(fullName).trim();
  const cleanBrand = String(brand).trim().toLowerCase();
  const nameLowercase = cleanName.toLowerCase();

  let remainingName = cleanName;
  if (cleanBrand && nameLowercase.startsWith(cleanBrand)) {
    remainingName = cleanName.slice(cleanBrand.length).trim();
  }

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

  const parts = remainingName.split(/\s+/);
  let model = "";
  let productType = "";
  let foundKeywordAt = -1;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].toLowerCase().replace(/[^a-z0-9]/g, "");
    if (PRODUCT_TYPE_KEYWORDS.has(part)) {
      foundKeywordAt = i;
      break;
    }
  }

  if (foundKeywordAt >= 0) {
    model = parts.slice(0, foundKeywordAt).join(" ");
    productType = parts.slice(foundKeywordAt).join(" ");
  } else if (parts.length > 1) {
    const modelTokens = Math.min(2, Math.ceil(parts.length / 2));
    model = parts.slice(0, modelTokens).join(" ");
    productType = parts.slice(modelTokens).join(" ");
  } else {
    productType = remainingName;
  }

  return {
    brand: cleanBrand,
    model: model.trim(),
    productType: productType.trim(),
  };
};

const generateSkuFromComponents = (
  brand = "",
  model = "",
  productType = "",
) => {
  const cleanBrand = String(brand || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  const cleanModel = String(model || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  const cleanProductType = String(productType || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-");

  const parts = [cleanBrand, cleanModel, cleanProductType].filter(Boolean);
  return parts.join("-").replace(/^-+|-+$/g, "");
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

// Test Cases
console.log("=== SKU/Slug Generation Tests ===\n");

const testCases = [
  {
    name: "Udyogi RL 22 Polyamide Rope Lanyard with Scaffolding Hook",
    brand: "Udyogi",
  },
  { name: "3M Safety Gloves Cut Resistant", brand: "3M" },
  { name: "Karam Safety Shoes Steel Toe", brand: "Karam" },
  { name: "Fiberglass Safety Helmet", brand: "Fiberglass" },
];

testCases.forEach((test) => {
  const {
    brand: extractedBrand,
    model,
    productType,
  } = extractProductComponents(test.name, test.brand);
  const branding = test.brand
    ? test.brand.charAt(0).toUpperCase() + test.brand.slice(1).toLowerCase()
    : extractedBrand.charAt(0).toUpperCase() + extractedBrand.slice(1);
  const sku = generateSkuFromComponents(branding, model, productType);
  const slug = test.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  console.log(`Product: ${test.name}`);
  console.log(`  Brand: ${branding}`);
  console.log(`  Model: ${model}`);
  console.log(`  Product Type: ${productType}`);
  console.log(`  SKU: ${sku}`);
  console.log(`  Slug: ${slug}`);
  console.log();
});

console.log("=== Specification Value Cleaning Tests ===\n");

const specCases = [
  "12 mm Polyester Rope",
  "23 kN (Minimum)",
  "2 kg Approx",
  "High tenacity virgin multifilament polyester stitching thread",
  "1.8 meter",
  "0.2 meter",
];

specCases.forEach((spec) => {
  console.log(`Original: "${spec}"`);
  console.log(`Cleaned:  "${cleanSpecificationValue(spec)}"`);
  console.log();
});
