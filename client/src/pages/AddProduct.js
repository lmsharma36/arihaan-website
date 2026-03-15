import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductUpload from "../components/ProductUpload";
import ProductSchemaAssistant from "../components/ProductSchemaAssistant";
import SeoHead from "../components/SeoHead";
import { products } from "../services/api";
import { normalizeProduct } from "../utils/productAdapter";
import "../styles/AddProduct.css";
import { getProductPath } from "../utils/seo";

const CATEGORY_OPTIONS = [
  { id: "head-hearing-protection", label: "Head & Hearing Protection" },
  { id: "eye-face-protection", label: "Eye & Face Protection" },
  { id: "respiratory-protection", label: "Respiratory Protection" },
  { id: "hand-arm-protection", label: "Hand & Arm Protection" },
  { id: "protective-clothing", label: "Protective Clothing" },
  { id: "safety-footwear", label: "Safety Footwear" },
  { id: "fall-protection", label: "Fall Protection" },
  { id: "traffic-safety-signage", label: "Traffic Safety & Signage" },
  { id: "confined-space-equipment", label: "Confined Space Equipment" },
  { id: "fire-safety", label: "Fire Safety" },
];

const PRICE_TYPE_OPTIONS = [
  "price_on_request",
  "fixed_price",
  "starting_from",
  "custom_quote",
];

const asString = (value) => String(value || "").trim();

const toSlug = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/["'`]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);

const parseCommaSeparated = (value = "") =>
  String(value || "")
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);

const isAdminUser = (user = {}) =>
  user?.role === "admin" || user?.isAdmin === true || user?.roleId === "admin";

const AddProduct = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    name: "",
    slug: "",
    brand: "",
    category: "",
    hsn: "",
    gstRate: "18",
    priceType: "price_on_request",
    displayLabel: "Price on Request",
    active: true,
    certificationInput: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createdProduct, setCreatedProduct] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userText = localStorage.getItem("user");
    let user = null;

    try {
      user = userText ? JSON.parse(userText) : null;
    } catch (error) {
      user = null;
    }

    if (!token || !isAdminUser(user)) {
      navigate("/login", { replace: true });
      return;
    }

    setAuthChecked(true);
  }, [navigate]);

  const createdProductId = createdProduct?._id || createdProduct?.id || "";
  const createdProductPath = createdProduct
    ? getProductPath(createdProduct)
    : "";

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Admin token not found. Please log in again.");
      return;
    }

    const payload = {
      sku: asString(form.sku),
      name: asString(form.name),
      slug: asString(form.slug) || toSlug(form.name || form.sku),
      brand: asString(form.brand),
      category: asString(form.category),
      hsn: asString(form.hsn),
      tax: {
        gst_rate: Number.parseFloat(form.gstRate) || 18,
      },
      pricing: {
        price_type: asString(form.priceType) || "price_on_request",
        display_label: asString(form.displayLabel) || "Price on Request",
      },
      active: Boolean(form.active),
      certification: parseCommaSeparated(form.certificationInput),
      specifications: {},
      variants: [],
      images: [],
      datasheet: "",
    };

    const missing = ["sku", "name", "slug", "brand", "category"].filter(
      (field) => !asString(payload[field]),
    );
    if (missing.length > 0) {
      setErrorMessage(`Missing required fields: ${missing.join(", ")}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await products.create(payload, token);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to create product");
      }

      const normalized = normalizeProduct(response.product || payload);
      setCreatedProduct(normalized);
      setSuccessMessage(
        "Product created successfully. You can now upload images/PDF and generate JSON.",
      );
    } catch (error) {
      setErrorMessage(error.message || "Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadSuccess = (result) => {
    if (!result || !createdProduct) return;

    if (result.type === "images" && Array.isArray(result.files)) {
      const nextImages = result.files.map((file) => file.url).filter(Boolean);
      setCreatedProduct((prev) => ({
        ...prev,
        images: nextImages.length > 0 ? nextImages : prev.images || [],
      }));
      return;
    }

    if (result.type === "datasheet" && result.file?.url) {
      setCreatedProduct((prev) => ({
        ...prev,
        datasheet: result.file.url,
      }));
    }
  };

  const handleSchemaProductUpdated = (updatedProduct) => {
    if (!updatedProduct) return;
    setCreatedProduct(normalizeProduct(updatedProduct));
  };

  if (!authChecked) {
    return (
      <div className="add-product-page">
        <SeoHead
          title="Admin Product Creation | ARIHAAN ENTERPRISES"
          description="Admin-only product creation area."
          canonicalPath="/products/new"
          noIndex
        />
        <section className="add-product-shell">
          <h1>Add New Product</h1>
          <p>Checking admin access...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="add-product-page">
      <SeoHead
        title="Admin Product Creation | ARIHAAN ENTERPRISES"
        description="Admin-only product creation area."
        canonicalPath="/products/new"
        noIndex
      />
      <section className="add-product-shell">
        <div className="add-product-top">
          <div>
            <h1>Add New Product</h1>
            <p>
              Step 1: Create a product. Step 2: Upload image/PDF. Step 3:
              Generate JSON and update MongoDB.
            </p>
          </div>
          <div className="add-product-top-actions">
            <Link to="/products" className="add-product-link-btn">
              Back to Products
            </Link>
            {createdProductId && (
              <Link
                to={createdProductPath}
                className="add-product-link-btn primary"
              >
                Open Product Page
              </Link>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="add-product-alert error">{errorMessage}</div>
        )}
        {successMessage && (
          <div className="add-product-alert success">{successMessage}</div>
        )}

        <div className="add-product-card">
          <h2>1) Create Product</h2>
          <form className="add-product-form" onSubmit={handleCreateProduct}>
            <div className="add-product-grid">
              <label>
                SKU *
                <input
                  type="text"
                  value={form.sku}
                  onChange={(event) => handleChange("sku", event.target.value)}
                  required
                />
              </label>

              <label>
                Name *
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name: nextName,
                      slug: prev.slug || toSlug(nextName),
                    }));
                  }}
                  required
                />
              </label>

              <label>
                Slug *
                <input
                  type="text"
                  value={form.slug}
                  onChange={(event) => handleChange("slug", event.target.value)}
                  required
                />
              </label>

              <label>
                Brand *
                <input
                  type="text"
                  value={form.brand}
                  onChange={(event) =>
                    handleChange("brand", event.target.value)
                  }
                  required
                />
              </label>

              <label>
                Category *
                <select
                  value={form.category}
                  onChange={(event) =>
                    handleChange("category", event.target.value)
                  }
                  required
                >
                  <option value="">Select category</option>
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                HSN
                <input
                  type="text"
                  value={form.hsn}
                  onChange={(event) => handleChange("hsn", event.target.value)}
                />
              </label>

              <label>
                GST Rate (%)
                <input
                  type="number"
                  value={form.gstRate}
                  onChange={(event) =>
                    handleChange("gstRate", event.target.value)
                  }
                />
              </label>

              <label>
                Price Type
                <select
                  value={form.priceType}
                  onChange={(event) =>
                    handleChange("priceType", event.target.value)
                  }
                >
                  {PRICE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="wide">
                Display Label
                <input
                  type="text"
                  value={form.displayLabel}
                  onChange={(event) =>
                    handleChange("displayLabel", event.target.value)
                  }
                />
              </label>

              <label className="wide">
                Certifications (comma separated)
                <input
                  type="text"
                  value={form.certificationInput}
                  onChange={(event) =>
                    handleChange("certificationInput", event.target.value)
                  }
                  placeholder="ISI, CE, ANSI"
                />
              </label>

              <label className="checkbox wide">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    handleChange("active", event.target.checked)
                  }
                />
                Active Product
              </label>
            </div>

            <button
              type="submit"
              className="add-product-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Product..." : "Create Product"}
            </button>
          </form>
        </div>

        {createdProductId && (
          <>
            <div className="add-product-card">
              <h2>2) Upload Product Media</h2>
              <ProductUpload
                productId={createdProductId}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>

            <div className="add-product-card">
              <h2>3) Generate / Edit JSON and Save</h2>
              <ProductSchemaAssistant
                productId={createdProductId}
                product={createdProduct}
                onProductUpdated={handleSchemaProductUpdated}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default AddProduct;
