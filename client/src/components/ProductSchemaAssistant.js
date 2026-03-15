import React, { useEffect, useState } from "react";
import { products } from "../services/api";
import "../styles/ProductSchemaAssistant.css";

const REQUIRED_FIELDS = ["sku", "name", "slug", "brand", "category"];

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

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

const asString = (value) =>
  typeof value === "string" ? value.trim() : String(value || "").trim();

const toNumber = (value, fallback = 18) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(asString(value));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = true) => {
  if (typeof value === "boolean") return value;

  const normalized = asString(value).toLowerCase();
  if (["true", "1", "yes", "active"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "inactive"].includes(normalized)) {
    return false;
  }

  return fallback;
};

const parseCommaSeparated = (value = "") =>
  String(value || "")
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);

const toSlug = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/["'`]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);

const serializeSpecValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
};

const parseSpecValue = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return "";

  if (
    (text.startsWith("{") && text.endsWith("}")) ||
    (text.startsWith("[") && text.endsWith("]"))
  ) {
    try {
      return JSON.parse(text);
    } catch (error) {
      // Keep as plain text when JSON parsing fails.
    }
  }

  if (/^(true|false)$/i.test(text)) {
    return /^true$/i.test(text);
  }

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return Number(text);
  }

  return text;
};

const isConnectivityWarning = (warning = "") =>
  /connection|network|certificate|tls|ssl|dns|proxy|time and sync windows time/i.test(
    String(warning || ""),
  );

const specificationsToRows = (specifications = {}) => {
  const entries = Object.entries(specifications || {});

  if (entries.length === 0) {
    return [{ key: "", value: "" }];
  }

  return entries.map(([key, value]) => ({
    key,
    value: serializeSpecValue(value),
  }));
};

const rowsToSpecifications = (rows = []) =>
  rows.reduce((acc, row) => {
    const key = asString(row?.key);
    if (!key) return acc;

    const value = parseSpecValue(row?.value);
    if (value === "") return acc;

    acc[key] = value;
    return acc;
  }, {});

const buildDefaultDraft = (product = {}) => {
  const gstRate =
    typeof product?.tax?.gst_rate === "number"
      ? product.tax.gst_rate
      : typeof product?.gstRate === "number"
        ? product.gstRate
        : 18;

  const sourcePricing = isPlainObject(product?.pricing) ? product.pricing : {};

  return {
    sku: asString(product?.sku),
    name: asString(product?.name),
    slug: asString(product?.slug),
    brand: asString(product?.brand),
    category: asString(product?.category),
    hsn: asString(product?.hsn),
    tax: {
      gst_rate: gstRate,
    },
    pricing: {
      price_type:
        asString(sourcePricing?.price_type || product?.priceType) ||
        "price_on_request",
      display_label:
        asString(sourcePricing?.display_label || product?.priceLabel) ||
        "Price on Request",
    },
    active:
      typeof product?.active === "boolean"
        ? product.active
        : typeof product?.isActive === "boolean"
          ? product.isActive
          : true,
    certification: Array.isArray(product?.certification)
      ? product.certification.map((item) => asString(item)).filter(Boolean)
      : [],
    specifications: isPlainObject(product?.specifications)
      ? product.specifications
      : {},
    variants: Array.isArray(product?.variants) ? product.variants : [],
    images: Array.isArray(product?.images) ? product.images : [],
    datasheet: asString(product?.datasheet),
  };
};

const normalizeDraftPayload = (payload = {}, fallback = {}) => {
  const baseline = {
    ...buildDefaultDraft({}),
    ...fallback,
    ...payload,
    tax: {
      ...(fallback?.tax || {}),
      ...(payload?.tax || {}),
    },
    pricing: {
      ...(fallback?.pricing || {}),
      ...(payload?.pricing || {}),
    },
  };

  const normalized = {
    sku: asString(baseline.sku),
    name: asString(baseline.name),
    slug: asString(baseline.slug),
    brand: asString(baseline.brand),
    category: asString(baseline.category),
    hsn: asString(baseline.hsn),
    tax: {
      gst_rate: toNumber(baseline?.tax?.gst_rate, 18),
    },
    pricing: {
      price_type: asString(baseline?.pricing?.price_type) || "price_on_request",
      display_label:
        asString(baseline?.pricing?.display_label) || "Price on Request",
    },
    active: toBoolean(baseline.active, true),
    certification: Array.isArray(baseline.certification)
      ? baseline.certification.map((item) => asString(item)).filter(Boolean)
      : [],
    specifications: isPlainObject(baseline.specifications)
      ? baseline.specifications
      : {},
    variants: Array.isArray(baseline.variants) ? baseline.variants : [],
    images: Array.isArray(baseline.images) ? baseline.images : [],
    datasheet: asString(baseline.datasheet),
  };

  if (!normalized.slug) {
    normalized.slug = toSlug(normalized.name || normalized.sku);
  }

  return normalized;
};

const ProductSchemaAssistant = ({ productId, product, onProductUpdated }) => {
  const [sourceFile, setSourceFile] = useState(null);
  const [sourceText, setSourceText] = useState("");
  const [generatorStatus, setGeneratorStatus] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [draft, setDraft] = useState(() =>
    normalizeDraftPayload(buildDefaultDraft(product)),
  );
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(normalizeDraftPayload(buildDefaultDraft(product)), null, 2),
  );
  const [specRows, setSpecRows] = useState(() =>
    specificationsToRows(buildDefaultDraft(product).specifications),
  );
  const [certificationInput, setCertificationInput] = useState(() =>
    (buildDefaultDraft(product).certification || []).join(", "),
  );
  const [generationInfo, setGenerationInfo] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSeconds, setGenerationSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const generationWarnings = Array.isArray(generationInfo?.warnings)
    ? generationInfo.warnings
    : [];
  const isAiConfigured = Boolean(
    generatorStatus?.aiConfigured || generatorStatus?.openAIConfigured,
  );
  const activeAiProvider =
    generatorStatus?.activeAiProvider ||
    (generatorStatus?.openAIConfigured ? "openai" : "");

  useEffect(() => {
    const nextDraft = normalizeDraftPayload(buildDefaultDraft(product));
    setDraft(nextDraft);
    setJsonText(JSON.stringify(nextDraft, null, 2));
    setSpecRows(specificationsToRows(nextDraft.specifications));
    setCertificationInput(nextDraft.certification.join(", "));
    setGenerationInfo(null);
  }, [product]);

  useEffect(() => {
    let isMounted = true;

    const loadGeneratorStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        if (isMounted) {
          setGeneratorStatus(null);
          setStatusError("");
        }
        return;
      }

      if (isMounted) {
        setIsCheckingStatus(true);
        setStatusError("");
      }

      try {
        const response = await products.getDraftStatus(token);

        if (!response.success) {
          throw new Error(
            response.message || "Failed to load generator status",
          );
        }

        if (isMounted) {
          setGeneratorStatus(response.status || null);
        }
      } catch (error) {
        if (isMounted) {
          setGeneratorStatus(null);
          setStatusError(error.message || "Failed to load generator status");
        }
      } finally {
        if (isMounted) {
          setIsCheckingStatus(false);
        }
      }
    };

    loadGeneratorStatus();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  useEffect(() => {
    if (!isGenerating) {
      setGenerationSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const intervalId = setInterval(() => {
      setGenerationSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isGenerating]);

  const handleRefreshGeneratorStatus = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setStatusError("Admin token not found. Please log in again.");
      return;
    }

    setIsCheckingStatus(true);
    setStatusError("");

    try {
      const response = await products.getDraftStatus(token);
      if (!response.success) {
        throw new Error(response.message || "Failed to load generator status");
      }

      setGeneratorStatus(response.status || null);
    } catch (error) {
      setGeneratorStatus(null);
      setStatusError(error.message || "Failed to load generator status");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const setDraftWithSync = (nextDraft) => {
    const normalized = normalizeDraftPayload(nextDraft, draft);
    setDraft(normalized);
    setJsonText(JSON.stringify(normalized, null, 2));
  };

  const syncFromRowsAndCertification = (nextRows, nextCertificationInput) => {
    const nextSpecifications = rowsToSpecifications(nextRows);
    const nextCertification = parseCommaSeparated(nextCertificationInput);

    const normalized = normalizeDraftPayload(
      {
        ...draft,
        specifications: nextSpecifications,
        certification: nextCertification,
      },
      draft,
    );

    setDraft(normalized);
    setJsonText(JSON.stringify(normalized, null, 2));
  };

  const handleGenerateDraft = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!sourceFile && !asString(sourceText)) {
      setErrorMessage(
        "Upload a file or paste text before generating draft JSON.",
      );
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Admin token not found. Please log in again.");
      return;
    }

    setIsGenerating(true);
    setGenerationInfo(null);

    try {
      const response = await products.generateDraft(
        productId,
        {
          sourceFile,
          sourceText,
        },
        token,
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to generate draft JSON");
      }

      const responseDraft =
        response?.draft && typeof response.draft === "object"
          ? response.draft
          : {};
      const responseImages = Array.isArray(responseDraft.images)
        ? responseDraft.images.filter(Boolean)
        : [];
      const generatedDraft = normalizeDraftPayload(
        {
          ...responseDraft,
          images: responseImages.length > 0 ? responseImages : draft.images,
          datasheet: asString(responseDraft.datasheet) || draft.datasheet,
        },
        draft,
      );
      setDraft(generatedDraft);
      setJsonText(JSON.stringify(generatedDraft, null, 2));
      setSpecRows(specificationsToRows(generatedDraft.specifications));
      setCertificationInput(generatedDraft.certification.join(", "));
      setGenerationInfo(response.extraction || null);
      const nextWarnings = Array.isArray(response?.extraction?.warnings)
        ? response.extraction.warnings
        : [];
      const hasConnectivityWarning = nextWarnings.some((warning) =>
        isConnectivityWarning(warning),
      );

      if (
        Array.isArray(response.missingRequiredFields) &&
        response.missingRequiredFields.length > 0
      ) {
        setErrorMessage(
          `Draft generated but missing required fields: ${response.missingRequiredFields.join(", ")}`,
        );
      } else if (nextWarnings.length > 0) {
        setSuccessMessage(
          response?.extraction?.usedAI
            ? "Draft JSON generated with warnings. Review it before saving."
            : hasConnectivityWarning
              ? "Draft JSON generated using fallback parser because the AI service could not complete securely from this network. Review the warning and retry after fixing system time or TLS/network settings."
              : response?.extraction?.usedOCR
                ? "Draft JSON generated using OCR + heuristic parser. Review and refine field-wise values before saving."
                : "Draft JSON generated using fallback parser because AI output was invalid. Review warnings and try Generate again.",
        );
      } else {
        setSuccessMessage("Draft JSON generated successfully.");
      }
    } catch (error) {
      setErrorMessage(error.message || "Failed to generate draft JSON");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyJsonToFields = () => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const parsed = JSON.parse(jsonText);
      const normalized = normalizeDraftPayload(parsed);

      setDraft(normalized);
      setJsonText(JSON.stringify(normalized, null, 2));
      setSpecRows(specificationsToRows(normalized.specifications));
      setCertificationInput(normalized.certification.join(", "));

      setSuccessMessage("JSON applied to field-wise editor.");
    } catch (error) {
      setErrorMessage("Invalid JSON format. Please fix JSON and try again.");
    }
  };

  const handleSaveToMongo = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Admin token not found. Please log in again.");
      return;
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch (error) {
      setErrorMessage("Invalid JSON format. Please fix JSON before saving.");
      return;
    }

    const payload = normalizeDraftPayload(parsedJson, draft);
    const missingFields = REQUIRED_FIELDS.filter(
      (field) => !asString(payload[field]),
    );

    if (missingFields.length > 0) {
      setErrorMessage(
        `Missing required fields: ${missingFields.join(", ")}. Please fill them before saving.`,
      );
      return;
    }

    setIsSaving(true);

    try {
      const response = await products.update(productId, payload, token, {
        replace: true,
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to update product");
      }

      const updatedProduct = response.product || null;
      if (onProductUpdated) {
        onProductUpdated(updatedProduct);
      }

      setDraft(payload);
      setJsonText(JSON.stringify(payload, null, 2));
      setSpecRows(specificationsToRows(payload.specifications));
      setCertificationInput(payload.certification.join(", "));
      setSuccessMessage("Product updated in MongoDB successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to update product");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="product-schema-assistant">
      <h3>Generate MongoDB JSON</h3>

      {errorMessage && (
        <div className="schema-message schema-message-error">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="schema-message schema-message-success">
          {successMessage}
        </div>
      )}
      {generationWarnings.length > 0 && (
        <div className="schema-message schema-message-warning">
          <div className="schema-warning-title">Generation warnings</div>
          <ul className="schema-warning-list">
            {generationWarnings.map((warning, index) => (
              <li key={`schema-warning-${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      <div
        className={`schema-status-card ${isAiConfigured ? "schema-status-card-ready" : "schema-status-card-fallback"}`}
      >
        <div className="schema-status-header">
          <div>
            <h4>Generator Status</h4>
            <p className="schema-status-text">
              {isAiConfigured
                ? `AI extraction is configured${activeAiProvider ? ` (${activeAiProvider})` : ""}. Uploaded image, PDF, and text inputs can use the backend AI parser.`
                : "AI extraction is not configured. Generation will fall back to heuristic parsing, which is less accurate than AI output."}
            </p>
          </div>
          <button
            type="button"
            className="schema-btn schema-btn-secondary"
            onClick={handleRefreshGeneratorStatus}
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? "Checking..." : "Refresh Status"}
          </button>
        </div>

        {statusError && (
          <div className="schema-message schema-message-warning">
            {statusError}
          </div>
        )}

        {generatorStatus && (
          <div className="schema-meta">
            <span>AI: {isAiConfigured ? "Configured" : "Missing"}</span>
            {activeAiProvider && <span>Provider: {activeAiProvider}</span>}
            {generatorStatus.aiProviderPreference && (
              <span>Preference: {generatorStatus.aiProviderPreference}</span>
            )}
            <span>
              PDF parser:{" "}
              {generatorStatus.pdfParserAvailable ? "Ready" : "Missing"}
            </span>
            <span>
              OCR: {generatorStatus.tesseractAvailable ? "Ready" : "Missing"}
            </span>
            {generatorStatus.textModel && (
              <span>Text model: {generatorStatus.textModel}</span>
            )}
            {generatorStatus.imageModel && (
              <span>Image model: {generatorStatus.imageModel}</span>
            )}
          </div>
        )}
      </div>

      <div className="schema-card">
        <h4>1) Upload Source or Paste Text</h4>
        <p className="schema-hint">
          Supported: image, PDF, text file, or manual text paste.
        </p>

        <input
          type="file"
          className="schema-file-input"
          accept="image/*,application/pdf,text/plain,text/markdown,application/json,text/csv,.txt,.md,.json,.csv"
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            setSourceFile(file);
            setErrorMessage("");
            setSuccessMessage("");
          }}
          disabled={isGenerating}
        />

        {sourceFile && (
          <div className="schema-selected-file">
            Selected file: {sourceFile.name} (
            {Math.round(sourceFile.size / 1024)} KB)
          </div>
        )}

        <label className="schema-label" htmlFor="sourceText">
          Additional Text / Manual Product Notes
        </label>
        <textarea
          id="sourceText"
          className="schema-textarea"
          rows={6}
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          placeholder="Paste brochure text, specifications, or product notes here..."
          disabled={isGenerating}
        />

        <button
          type="button"
          className="schema-btn schema-btn-primary"
          onClick={handleGenerateDraft}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Generate Ready JSON"}
        </button>

        {isGenerating && (
          <p className="schema-hint">
            AI generation in progress ({generationSeconds}s). GPT-5 typically
            responds in 20-60 seconds.
          </p>
        )}

        {generationInfo && (
          <div className="schema-meta">
            <span>Source: {generationInfo.sourceType || "unknown"}</span>
            <span>Parser: {generationInfo.usedAI ? "AI" : "Heuristic"}</span>
            {generationInfo.provider && (
              <span>Provider: {generationInfo.provider}</span>
            )}
            {typeof generationInfo.usedOCR === "boolean" && (
              <span>OCR: {generationInfo.usedOCR ? "Used" : "Not Used"}</span>
            )}
            {generationInfo.model && <span>Model: {generationInfo.model}</span>}
            <span>Extracted text: {generationInfo.textLength || 0} chars</span>
          </div>
        )}
      </div>

      <div className="schema-card">
        <h4>2) Field-wise Value Entry</h4>

        <div className="schema-grid">
          <div className="schema-field">
            <label>SKU *</label>
            <input
              type="text"
              value={draft.sku}
              onChange={(event) =>
                setDraftWithSync({ ...draft, sku: event.target.value })
              }
            />
          </div>

          <div className="schema-field">
            <label>Name *</label>
            <input
              type="text"
              value={draft.name}
              onChange={(event) => {
                const nextName = event.target.value;
                const nextSlug = draft.slug || toSlug(nextName);
                setDraftWithSync({ ...draft, name: nextName, slug: nextSlug });
              }}
            />
          </div>

          <div className="schema-field">
            <label>Slug *</label>
            <input
              type="text"
              value={draft.slug}
              onChange={(event) =>
                setDraftWithSync({ ...draft, slug: event.target.value })
              }
            />
          </div>

          <div className="schema-field">
            <label>Brand *</label>
            <input
              type="text"
              value={draft.brand}
              onChange={(event) =>
                setDraftWithSync({ ...draft, brand: event.target.value })
              }
            />
          </div>

          <div className="schema-field">
            <label>Category *</label>
            <select
              value={draft.category}
              onChange={(event) =>
                setDraftWithSync({ ...draft, category: event.target.value })
              }
            >
              <option value="">Select category</option>
              {CATEGORY_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="schema-field">
            <label>HSN</label>
            <input
              type="text"
              value={draft.hsn}
              onChange={(event) =>
                setDraftWithSync({ ...draft, hsn: event.target.value })
              }
            />
          </div>

          <div className="schema-field">
            <label>GST Rate (%)</label>
            <input
              type="number"
              value={draft?.tax?.gst_rate ?? 18}
              onChange={(event) =>
                setDraftWithSync({
                  ...draft,
                  tax: {
                    ...(draft.tax || {}),
                    gst_rate: toNumber(event.target.value, 18),
                  },
                })
              }
            />
          </div>

          <div className="schema-field">
            <label>Price Type</label>
            <select
              value={draft?.pricing?.price_type || "price_on_request"}
              onChange={(event) =>
                setDraftWithSync({
                  ...draft,
                  pricing: {
                    ...(draft.pricing || {}),
                    price_type: event.target.value,
                  },
                })
              }
            >
              {PRICE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="schema-field schema-field-wide">
            <label>Display Label</label>
            <input
              type="text"
              value={draft?.pricing?.display_label || ""}
              onChange={(event) =>
                setDraftWithSync({
                  ...draft,
                  pricing: {
                    ...(draft.pricing || {}),
                    display_label: event.target.value,
                  },
                })
              }
            />
          </div>

          <div className="schema-field schema-field-checkbox">
            <label>
              <input
                type="checkbox"
                checked={Boolean(draft.active)}
                onChange={(event) =>
                  setDraftWithSync({ ...draft, active: event.target.checked })
                }
              />
              Active Product
            </label>
          </div>

          <div className="schema-field schema-field-wide">
            <label>Certifications (comma separated)</label>
            <input
              type="text"
              value={certificationInput}
              onChange={(event) => {
                const nextValue = event.target.value;
                setCertificationInput(nextValue);
                syncFromRowsAndCertification(specRows, nextValue);
              }}
              placeholder="ISI, CE, ANSI"
            />
          </div>
        </div>

        <div className="schema-spec-section">
          <div className="schema-spec-header">
            <h5>Specifications</h5>
            <button
              type="button"
              className="schema-btn schema-btn-secondary"
              onClick={() => {
                const nextRows = [...specRows, { key: "", value: "" }];
                setSpecRows(nextRows);
                syncFromRowsAndCertification(nextRows, certificationInput);
              }}
            >
              Add Field
            </button>
          </div>

          <div className="schema-spec-rows">
            {specRows.map((row, index) => (
              <div key={`spec-row-${index}`} className="schema-spec-row">
                <input
                  type="text"
                  placeholder="Specification key"
                  value={row.key}
                  onChange={(event) => {
                    const nextRows = specRows.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, key: event.target.value }
                        : item,
                    );
                    setSpecRows(nextRows);
                    syncFromRowsAndCertification(nextRows, certificationInput);
                  }}
                />
                <input
                  type="text"
                  placeholder='Value (for JSON use {"k":"v"} or ["a"])'
                  value={row.value}
                  onChange={(event) => {
                    const nextRows = specRows.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, value: event.target.value }
                        : item,
                    );
                    setSpecRows(nextRows);
                    syncFromRowsAndCertification(nextRows, certificationInput);
                  }}
                />
                <button
                  type="button"
                  className="schema-btn schema-btn-danger"
                  onClick={() => {
                    const nextRows = specRows.filter(
                      (_, itemIndex) => itemIndex !== index,
                    );
                    const ensuredRows =
                      nextRows.length > 0 ? nextRows : [{ key: "", value: "" }];
                    setSpecRows(ensuredRows);
                    syncFromRowsAndCertification(
                      ensuredRows,
                      certificationInput,
                    );
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="schema-card">
        <h4>3) Ready JSON and MongoDB Update</h4>

        <textarea
          className="schema-json"
          rows={18}
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
        />

        <div className="schema-actions">
          <button
            type="button"
            className="schema-btn schema-btn-secondary"
            onClick={handleApplyJsonToFields}
          >
            Apply JSON To Fields
          </button>

          <button
            type="button"
            className="schema-btn schema-btn-primary"
            onClick={handleSaveToMongo}
            disabled={isSaving}
          >
            {isSaving ? "Updating MongoDB..." : "Update MongoDB"}
          </button>
        </div>

        <p className="schema-save-note">
          Update MongoDB saves the JSON editor as a full replacement. Removed
          fields will be deleted from MongoDB.
        </p>
      </div>
    </div>
  );
};

export default ProductSchemaAssistant;
