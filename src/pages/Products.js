import React, { useState, useEffect, useRef } from "react";
import {
  Link,
  useSearchParams,
  useLocation,
  useNavigate,
  useNavigationType,
} from "react-router-dom";
import SeoHead from "../components/SeoHead";
import "../styles/Products.css";
import {
  extractProductsFromResponse,
  normalizeProduct,
} from "../utils/productAdapter";
import { getApiBaseUrl, getAssetUrl } from "../services/apiConfig";
import { buildAbsoluteUrl, getProductPath } from "../utils/seo";

const API_URL = getApiBaseUrl();
const stripGstFromLabel = (label = "") =>
  String(label)
    .replace(/\s*\+?\s*\d+%\s*GST/gi, "")
    .replace(/\s*\+?\s*GST/gi, "")
    .trim();
const normalizeSearchInput = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();
const normalizeSearchQuery = (value = "") =>
  normalizeSearchInput(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const normalizeBrandToken = (value = "") => normalizeSearchQuery(value);
const parsePageParam = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};
const PRODUCTS_PAGE_STORAGE_KEY = "productsCurrentPage";
const PRODUCTS_RESTORE_SCROLL_TARGET = "products-pagination-top";
const PRODUCTS_RESTORE_PRODUCT_TARGET = "products-product-card";
const PRODUCTS_PENDING_RESTORE_KEY = "productsPendingRestore";
const saveProductsPage = (pageNumber) => {
  try {
    sessionStorage.setItem(PRODUCTS_PAGE_STORAGE_KEY, String(pageNumber));
  } catch (error) {
    // ignore storage errors
  }
};

const readPendingProductRestore = () => {
  try {
    const raw = sessionStorage.getItem(PRODUCTS_PENDING_RESTORE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const productId = String(parsed?.productId || "").trim();
    return productId ? { productId } : null;
  } catch (error) {
    return null;
  }
};

const clearPendingProductRestore = () => {
  try {
    sessionStorage.removeItem(PRODUCTS_PENDING_RESTORE_KEY);
  } catch (error) {
    // ignore storage errors
  }
};

const savePendingProductRestore = (productId) => {
  try {
    sessionStorage.setItem(
      PRODUCTS_PENDING_RESTORE_KEY,
      JSON.stringify({ productId: String(productId || "") }),
    );
  } catch (error) {
    // ignore storage errors
  }
};

const productsStructuredData = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Safety Products Catalog",
  url: buildAbsoluteUrl("/products"),
  description:
    "Browse safety shoes, helmets, gloves, respirators, fall protection, and industrial PPE products supplied by ARIHAAN ENTERPRISES.",
};

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();
  const categoryParam = searchParams.get("category") || "";
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isProductsLoaded, setIsProductsLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "",
  );
  const [selectedBrand, setSelectedBrand] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [draftCategory, setDraftCategory] = useState(
    searchParams.get("category") || "",
  );
  const [draftBrand, setDraftBrand] = useState("");
  const [draftSearchQuery, setDraftSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [desktopFilterHeight, setDesktopFilterHeight] = useState(0);
  const [isFilterPinned, setIsFilterPinned] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const pageFromUrl = searchParams.get("page");
    if (pageFromUrl != null) {
      return parsePageParam(pageFromUrl);
    }

    try {
      return parsePageParam(
        sessionStorage.getItem(PRODUCTS_PAGE_STORAGE_KEY) || "1",
      );
    } catch (error) {
      return 1;
    }
  });
  const [productsPerPage] = useState(12);
  const filtersRef = useRef(null);
  const filterToggleRef = useRef(null);
  const [mobileFilterToggleHeight, setMobileFilterToggleHeight] = useState(0);
  const pageParam = searchParams.get("page");
  const pendingRestoreRef = useRef(null);

  const categories = [
    {
      id: "head-hearing-protection",
      name: "Head & Hearing Protection",
      icon: "🪖🎧",
    },
    { id: "eye-face-protection", name: "Eye & Face Protection", icon: "🥽" },
    {
      id: "respiratory-protection",
      name: "Respiratory Protection",
      icon: "😷",
    },
    { id: "hand-arm-protection", name: "Hand & Arm Protection", icon: "🧤" },
    { id: "protective-clothing", name: "Protective Clothing", icon: "👷" },
    { id: "safety-footwear", name: "Safety Footwear", icon: "🥾" },
    { id: "fall-protection", name: "Fall Protection", icon: "🪂" },
    {
      id: "traffic-safety-signage",
      name: "Traffic Safety & Signage",
      icon: "🚦",
    },
    {
      id: "confined-space-equipment",
      name: "Confined Space Equipment",
      icon: "⚙️",
    },
    { id: "fire-safety", name: "Fire Safety", icon: "🔥" },
  ];

  const brands = [
    "3M",
    "Honeywell",
    "Ansell",
    "Karam",
    "Dräger",
    "Udyogi",
    "Other",
  ];

  // ✅ FETCH PRODUCTS FROM DATABASE
  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userText = localStorage.getItem("user");

    if (!token || !userText) {
      setIsAdmin(false);
      return;
    }

    try {
      const user = JSON.parse(userText);
      const adminUser =
        user?.role === "admin" ||
        user?.isAdmin === true ||
        user?.roleId === "admin";
      setIsAdmin(Boolean(adminUser));
    } catch (error) {
      setIsAdmin(false);
    }
  }, [location.pathname]);

  const fetchProducts = async () => {
    try {
      setIsProductsLoaded(false);
      const response = await fetch(`${API_URL}/products`);
      const data = await response.json();

      if (data.success || data.products || data.items || data.data) {
        const normalizedProducts =
          extractProductsFromResponse(data).map(normalizeProduct);
        const activeProducts = normalizedProducts.filter(
          (p) => p.isActive !== false,
        );
        setProducts(activeProducts);
        setFilteredProducts(activeProducts);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      alert("Unable to load products. Check if npm run dev is running!");
    } finally {
      setIsProductsLoaded(true);
    }
  };

  // ✅ Pin/unpin filter bar based on scroll direction
  useEffect(() => {
    const lastScrollY = { current: window.scrollY };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const pinThreshold = window.innerWidth <= 720 ? 120 : 180;

      if (currentScrollY <= 10) {
        setIsFilterPinned(false);
      } else if (
        currentScrollY > lastScrollY.current + 2 &&
        currentScrollY > pinThreshold
      ) {
        setIsFilterPinned(true);
      } else if (currentScrollY < lastScrollY.current - 2) {
        setIsFilterPinned(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ Measure filter bar height for spacing only when pinned
  useEffect(() => {
    const updateDesktopFilterHeight = () => {
      if (!filtersRef.current || window.innerWidth <= 720) {
        setDesktopFilterHeight(0);
        return;
      }

      setDesktopFilterHeight(filtersRef.current.offsetHeight);
    };

    updateDesktopFilterHeight();
    window.addEventListener("resize", updateDesktopFilterHeight);
    return () => {
      window.removeEventListener("resize", updateDesktopFilterHeight);
    };
  }, []);

  useEffect(() => {
    const updateMobileFilterToggleHeight = () => {
      if (!filterToggleRef.current || window.innerWidth > 720) {
        setMobileFilterToggleHeight(0);
        return;
      }

      setMobileFilterToggleHeight(filterToggleRef.current.offsetHeight);
    };

    updateMobileFilterToggleHeight();
    window.addEventListener("resize", updateMobileFilterToggleHeight);
    return () => {
      window.removeEventListener("resize", updateMobileFilterToggleHeight);
    };
  }, [
    showFilters,
    selectedCategory,
    draftCategory,
    draftBrand,
    draftSearchQuery,
  ]);

  useEffect(() => {
    let filtered = [...products];

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (selectedBrand) {
      const normalizedSelectedBrand = normalizeBrandToken(selectedBrand);
      filtered = filtered.filter(
        (p) => normalizeBrandToken(p.brand) === normalizedSelectedBrand,
      );
    }

    const normalizedSearch = normalizeSearchQuery(searchQuery);

    if (normalizedSearch) {
      filtered = filtered.filter((p) =>
        [p.name, p.sku, p.description]
          .map((value) => normalizeSearchQuery(value))
          .join(" ")
          .includes(normalizedSearch),
      );
    }

    setFilteredProducts(filtered);
  }, [selectedCategory, selectedBrand, searchQuery, products]);

  useEffect(() => {
    saveProductsPage(currentPage);
  }, [currentPage]);

  // Keep selectedCategory in sync when the URL query changes (e.g. footer links)
  useEffect(() => {
    if (categoryParam !== selectedCategory) {
      setSelectedCategory(categoryParam);
    }
    if (categoryParam !== draftCategory) {
      setDraftCategory(categoryParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam]);

  useEffect(() => {
    setDraftBrand(selectedBrand);
  }, [selectedBrand]);

  useEffect(() => {
    setDraftSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const nextPageFromUrl = parsePageParam(pageParam);
    if (nextPageFromUrl !== currentPage) {
      setCurrentPage(nextPageFromUrl);
    }
  }, [pageParam, currentPage]);

  // Capture the restore intent when navigating back
  useEffect(() => {
    let restoreTarget = location.state?.restoreScrollTarget;
    let restoreProductId = location.state?.restoreProductId;

    if (!restoreTarget && navigationType === "POP") {
      const pendingRestore = readPendingProductRestore();
      if (pendingRestore?.productId) {
        restoreTarget = PRODUCTS_RESTORE_PRODUCT_TARGET;
        restoreProductId = pendingRestore.productId;
      }
    }

    if (restoreTarget) {
      pendingRestoreRef.current = { restoreTarget, restoreProductId };
    } else {
      pendingRestoreRef.current = null;
      clearPendingProductRestore();
    }
  }, [location, navigationType]);

  // Execute scroll once products are loaded
  useEffect(() => {
    if (!isProductsLoaded || !pendingRestoreRef.current) return;

    const { restoreTarget, restoreProductId: restoreProductIdFromState } =
      pendingRestoreRef.current;
    pendingRestoreRef.current = null;

    const doScroll = () => {
      const restoreProductId = String(restoreProductIdFromState || "").trim();
      let targetElement = null;

      if (
        restoreTarget === PRODUCTS_RESTORE_PRODUCT_TARGET &&
        restoreProductId
      ) {
        const sanitizedProductId = restoreProductId.replace(/"/g, '\\"');
        targetElement = document.querySelector(
          `.product-card[data-product-id="${sanitizedProductId}"]`,
        );
      }

      if (!targetElement && restoreTarget === PRODUCTS_RESTORE_SCROLL_TARGET) {
        targetElement =
          document.querySelector(".pagination.pagination-top") ||
          document.querySelector(".products-info");
      }

      if (!targetElement) {
        targetElement = document.querySelector(".products-info");
      }

      if (targetElement) {
        const productsPage = document.querySelector(".products-page");
        const isPinned = productsPage?.classList.contains("filters-pinned");
        const navHeight = document.querySelector(".navbar")?.offsetHeight || 0;
        const desktopFiltersHeight =
          document.querySelector(".filters-section")?.offsetHeight || 0;
        const mobileToggleHeight =
          document.querySelector(".filter-toggle-container")?.offsetHeight || 0;
        const activeFilterHeight = isPinned
          ? window.innerWidth <= 720
            ? mobileToggleHeight
            : desktopFiltersHeight
          : 0;
        const top =
          targetElement.getBoundingClientRect().top +
          window.scrollY -
          (navHeight + activeFilterHeight + 8);
        window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "auto" });
      }

      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: {} },
      );
      clearPendingProductRestore();
    };

    const timerId = window.setTimeout(doScroll, 60);
    return () => window.clearTimeout(timerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProductsLoaded]);

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedBrand("");
    setSearchQuery("");
    setDraftCategory("");
    setDraftBrand("");
    setDraftSearchQuery("");
    setCurrentPage(1);
    saveProductsPage(1);
    setSearchParams({});
  };

  const handleMobileQuickClear = () => {
    clearFilters();
    setShowFilters(false);
  };

  const scrollToProductsInfo = () => {
    const el = document.querySelector(".products-info");
    if (!el) return;

    const navHeight = document.querySelector(".navbar")?.offsetHeight || 0;
    const filtersHeight =
      document.querySelector(".filters-section")?.offsetHeight || 0;
    const extraGap = 12;
    const top =
      el.getBoundingClientRect().top +
      window.scrollY -
      (navHeight + filtersHeight + extraGap);

    window.scrollTo({ top, left: 0, behavior: "smooth" });
  };

  const applyFilters = () => {
    const normalizedDraftSearch = normalizeSearchInput(draftSearchQuery);

    setSelectedCategory(draftCategory);
    setSelectedBrand(draftBrand);
    setSearchQuery(normalizedDraftSearch);
    setDraftSearchQuery(normalizedDraftSearch);
    setCurrentPage(1);
    saveProductsPage(1);
    setSearchParams(draftCategory ? { category: draftCategory } : {});

    if (window.innerWidth <= 720) {
      setShowFilters(false);
      setTimeout(scrollToProductsInfo, 180);
    } else {
      setTimeout(scrollToProductsInfo, 100);
    }
  };

  const handleSearchInputKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applyFilters();
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.icon : "🛡️";
  };

  const buildDetailNavigationState = (productId = "") => ({
    from: {
      pathname: location.pathname,
      search: location.search,
    },
    sourceProductId: String(productId || "").trim(),
  });
  const hasCategorySelected = Boolean(selectedCategory || draftCategory);
  const clearFiltersButtonLabel = hasCategorySelected
    ? "Clear Category"
    : "Clear Filters";
  const clearFiltersButtonTooltip = hasCategorySelected
    ? "Category selected. Click to clear all filters."
    : "Clear all active filters";
  const hasAnyFilterValues = Boolean(
    selectedCategory ||
    selectedBrand ||
    normalizeSearchInput(searchQuery) ||
    draftCategory ||
    draftBrand ||
    normalizeSearchInput(draftSearchQuery),
  );

  // Pagination calculations
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct,
  );
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  useEffect(() => {
    if (!isProductsLoaded) {
      return;
    }

    if (totalPages > 0 && currentPage > totalPages) {
      const nextParams = new URLSearchParams(searchParams);
      if (totalPages > 1) {
        nextParams.set("page", String(totalPages));
      } else {
        nextParams.delete("page");
      }
      setSearchParams(nextParams, { replace: true });
      setCurrentPage(totalPages);
    }
  }, [
    totalPages,
    currentPage,
    isProductsLoaded,
    searchParams,
    setSearchParams,
  ]);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const firstBlockCount = 6;

    if (totalPages <= firstBlockCount + 1) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    if (currentPage <= firstBlockCount) {
      for (let i = 1; i <= firstBlockCount; i++) {
        pages.push(i);
      }

      pages.push({
        type: "ellipsis",
        targetPage: firstBlockCount + 1,
      });
      pages.push(totalPages);
      return pages;
    }

    pages.push(1);

    const windowStart = Math.max(2, currentPage - 1);
    const windowEnd = Math.min(totalPages - 1, currentPage + 1);

    if (windowStart > 2) {
      pages.push({
        type: "ellipsis",
        targetPage: windowStart - 1,
      });
    }

    for (let i = windowStart; i <= windowEnd; i++) {
      pages.push(i);
    }

    if (windowEnd < totalPages - 1) {
      pages.push({
        type: "ellipsis",
        targetPage: windowEnd + 1,
      });
    }

    pages.push(totalPages);

    return pages;
  };

  const renderPagination = (placement = "bottom") => {
    if (totalPages <= 1) return null;

    return (
      <div className={`pagination pagination-${placement}`}>
        <button
          className="pagination-btn"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          ← Previous
        </button>

        <div className="pagination-numbers">
          {getPageNumbers().map((page, index) =>
            typeof page === "object" && page?.type === "ellipsis" ? (
              <button
                key={`ellipsis-${placement}-${index}`}
                type="button"
                className="pagination-ellipsis pagination-ellipsis-btn"
                onClick={() => handlePageChange(page.targetPage)}
                aria-label={`Go to page ${page.targetPage}`}
              >
                ...
              </button>
            ) : (
              <button
                key={`${placement}-${page}`}
                className={`pagination-number ${currentPage === page ? "active" : ""}`}
                onClick={() => handlePageChange(page)}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            ),
          )}
        </div>

        <button
          className="pagination-btn"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    );
  };

  const handlePageChange = (pageNumber) => {
    if (
      pageNumber < 1 ||
      pageNumber > totalPages ||
      pageNumber === currentPage
    ) {
      return;
    }

    saveProductsPage(pageNumber);
    setCurrentPage(pageNumber);
    const nextParams = new URLSearchParams(searchParams);
    if (pageNumber > 1) {
      nextParams.set("page", String(pageNumber));
    } else {
      nextParams.delete("page");
    }
    setSearchParams(nextParams, { replace: true });

    // Scroll to top of products section
    const productsSection = document.querySelector(".products-section");
    if (productsSection) {
      const navHeight = document.querySelector(".navbar")?.offsetHeight || 0;
      const filtersHeight =
        document.querySelector(".filters-section")?.offsetHeight || 0;
      const offset = navHeight + filtersHeight + 20;
      const top =
        productsSection.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div
      className={`products-page ${isFilterPinned ? "filters-pinned" : ""}`}
      style={{
        "--products-filter-height": `${desktopFilterHeight}px`,
        "--products-mobile-filter-toggle-height": `${mobileFilterToggleHeight}px`,
      }}
    >
      <SeoHead
        title="Safety Products Catalog | PPE, Safety Shoes, Gloves, Helmets | ARIHAAN ENTERPRISES"
        description="Browse industrial PPE and safety products including footwear, gloves, helmets, respirators, and fall protection from trusted brands across India."
        canonicalPath="/products"
        structuredData={productsStructuredData}
      />

      {/* Page Header */}
      <section className="page-header">
        <h1>Our Products</h1>
        <p>Complete range of safety equipment from world's leading brands</p>
        {isAdmin && (
          <div className="products-header-actions">
            <Link to="/products/new" className="add-product-cta">
              + Add New Product
            </Link>
          </div>
        )}
      </section>

      {/* Filter Toggle Button */}
      <div ref={filterToggleRef} className="filter-toggle-container">
        <button
          type="button"
          className="filter-toggle-btn"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "✕ Hide Filters" : "⚙️ Show Filters"}
        </button>
        <button
          type="button"
          className={`filter-quick-clear-btn ${hasCategorySelected ? "category-selected" : ""}`}
          onClick={handleMobileQuickClear}
          disabled={!hasAnyFilterValues}
          title={clearFiltersButtonTooltip}
        >
          {clearFiltersButtonLabel}
        </button>
      </div>

      {/* Backdrop overlay */}
      {showFilters && (
        <div
          className="filters-backdrop"
          onClick={() => setShowFilters(false)}
        ></div>
      )}

      {/* Filters */}
      <section
        ref={filtersRef}
        className={`filters-section ${showFilters ? "active" : ""}`}
      >
        <div className="filters-container">
          <button
            type="button"
            className="mobile-filters-close"
            onClick={() => setShowFilters(false)}
          >
            ✕ Close Filters
          </button>

          <div className="filter-group">
            <label>Category</label>
            <select
              value={draftCategory}
              onChange={(e) => {
                setDraftCategory(e.target.value);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Brand</label>
            <select
              value={draftBrand}
              onChange={(e) => setDraftBrand(e.target.value)}
            >
              <option value="">All Brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search products..."
              value={draftSearchQuery}
              onChange={(e) => setDraftSearchQuery(e.target.value)}
              onKeyDown={handleSearchInputKeyDown}
            />
          </div>

          <button
            type="button"
            className="apply-filters-btn"
            onClick={applyFilters}
          >
            Apply Filters
          </button>

          <button
            type="button"
            className={`clear-filters-btn ${hasCategorySelected ? "category-selected" : ""}`}
            onClick={clearFilters}
            title={clearFiltersButtonTooltip}
          >
            {clearFiltersButtonLabel}
          </button>
        </div>
      </section>

      {/* Category Grid */}
      <section className="categories-section">
        <div className="section-label">Browse by Category</div>
        <div className="categories-grid">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`category-card ${selectedCategory === category.id ? "active" : ""}`}
              onClick={() => {
                setSelectedCategory(category.id);
                setCurrentPage(1);
                saveProductsPage(1);
                setSearchParams({ category: category.id });
              }}
            >
              <span className="category-icon">{category.icon}</span>
              <h3>{category.name}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="products-section">
        <div className="products-info">
          <p>
            Showing{" "}
            <strong>
              {indexOfFirstProduct + 1}-
              {Math.min(indexOfLastProduct, filteredProducts.length)}
            </strong>{" "}
            of <strong>{filteredProducts.length}</strong> products
            {totalPages > 1 && (
              <span className="page-indicator">
                {" "}
                (Page {currentPage} of {totalPages})
              </span>
            )}
          </p>
        </div>

        {renderPagination("top")}

        {filteredProducts.length === 0 ? (
          !isProductsLoaded ? (
            <div className="no-products">
              <div className="products-loading-spinner" />
              <p>Loading products...</p>
            </div>
          ) : (
            <div className="no-products">
              <h3>No products found</h3>
              <p>Try adjusting your filters or search terms</p>
            </div>
          )
        ) : (
          <>
            <div className="products-grid">
              {currentProducts.map((product) => {
                const productId = product._id || product.id;
                const productPath = getProductPath(product);
                return (
                  <div
                    key={productId}
                    className="product-card"
                    data-product-id={String(productId || "")}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      // don't navigate when clicking inner links or buttons
                      if (e.target.closest("a") || e.target.closest("button"))
                        return;
                      saveProductsPage(currentPage);
                      savePendingProductRestore(productId);
                      navigate(productPath, {
                        state: buildDetailNavigationState(productId),
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        saveProductsPage(currentPage);
                        savePendingProductRestore(productId);
                        navigate(productPath, {
                          state: buildDetailNavigationState(productId),
                        });
                      }
                    }}
                  >
                    <div className="product-image">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={getAssetUrl(product.images[0])}
                          alt={product.name}
                          className="product-img"
                        />
                      ) : (
                        <>{getCategoryIcon(product.category)}</>
                      )}
                      {product.brand && (
                        <span className="brand-badge">{product.brand}</span>
                      )}
                      {typeof product.stock === "number" && (
                        <span
                          className={`stock-badge ${product.stock < 50 ? "low" : ""}`}
                        >
                          {product.stock > 0
                            ? `In Stock (${product.stock})`
                            : "Out of Stock"}
                        </span>
                      )}
                    </div>
                    <div className="product-info">
                      <div className="product-category">
                        {
                          categories.find((c) => c.id === product.category)
                            ?.name
                        }
                      </div>
                      {product.hsn && (
                        <div className="product-category">
                          HSN: {product.hsn}
                        </div>
                      )}
                      {typeof product.gstRate === "number" && (
                        <div className="product-category">
                          GST: {product.gstRate}%
                        </div>
                      )}
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-description">
                        {product.description}
                      </p>
                      {product.certification && (
                        <div className="product-certs">
                          {product.certification.map((cert, idx) => (
                            <span key={idx} className="cert-badge">
                              {cert}
                            </span>
                          ))}
                        </div>
                      )}
                      <div
                        className={`product-price ${!product.hasNumericPrice ? "price-on-request" : ""}`}
                      >
                        {product.hasNumericPrice ? (
                          <>
                            ₹
                            {Number(product.price || 0).toLocaleString("en-IN")}
                          </>
                        ) : (
                          <>
                            {stripGstFromLabel(
                              product.priceLabel || "Price on Request",
                            ) || "Price on Request"}
                          </>
                        )}
                      </div>
                      <div className="product-actions">
                        <Link
                          to={productPath}
                          state={buildDetailNavigationState(productId)}
                          className="btn-view"
                          onClick={() => { saveProductsPage(currentPage); savePendingProductRestore(productId); }}
                        >
                          View Details
                        </Link>
                        <Link to="/contact" className="btn-enquiry">
                          Enquiry
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {renderPagination("bottom")}
          </>
        )}
      </section>
    </div>
  );
};

export default Products;
