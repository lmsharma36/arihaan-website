// src/services/api.js
// ARIHAAN ENTERPRISES - API Service
// यह file React app के src/services/ folder में रखें

import { getApiBaseUrl } from "./apiConfig";

const API_URL = getApiBaseUrl();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_AI_DRAFT_TIMEOUT_MS = 420000;
const MIN_AI_DRAFT_TIMEOUT_MS = 300000;
const DEFAULT_AI_DRAFT_PDF_TIMEOUT_MS = 600000;

const resolveAiDraftTimeoutMs = (source = {}) => {
  const baseTimeoutMs = parsePositiveInt(
    process.env.REACT_APP_AI_DRAFT_TIMEOUT_MS,
    DEFAULT_AI_DRAFT_TIMEOUT_MS,
  );
  const fileType = String(source?.sourceFile?.type || "").toLowerCase();

  if (fileType === "application/pdf") {
    const pdfTimeoutMs = parsePositiveInt(
      process.env.REACT_APP_AI_DRAFT_TIMEOUT_PDF_MS,
      DEFAULT_AI_DRAFT_PDF_TIMEOUT_MS,
    );
    return Math.max(pdfTimeoutMs, MIN_AI_DRAFT_TIMEOUT_MS);
  }

  return Math.max(baseTimeoutMs, MIN_AI_DRAFT_TIMEOUT_MS);
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// ==================== Authentication APIs ====================
export const auth = {
  // Login
  login: (email, password) =>
    apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Change password using current password
  changePassword: (email, currentPassword, newPassword) =>
    apiCall("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ email, currentPassword, newPassword }),
    }),

  // Register new user
  register: (userData) =>
    apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  // Get current logged in user
  getCurrentUser: (token) =>
    apiCall("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ==================== Products APIs ====================
export const products = {
  // Get all products (with optional filters)
  getAll: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return apiCall(`/products${queryString ? "?" + queryString : ""}`);
  },

  // Get single product by ID
  getById: (id) => apiCall(`/products/${id}`),

  // Create new product (Admin only)
  create: (productData, token) =>
    apiCall("/products", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(productData),
    }),

  // Update product (Admin only)
  update: (id, productData, token, options = {}) =>
    apiCall(`/products/${id}${options?.replace ? "?mode=replace" : ""}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(productData),
    }),

  // Delete product (Admin only)
  delete: (id, token) =>
    apiCall(`/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Generate schema-ready draft payload from image/PDF/text (Admin only)
  generateDraft: async (id, source, token) => {
    const formData = new FormData();

    if (source?.sourceFile) {
      formData.append("sourceFile", source.sourceFile);
    }

    if (source?.sourceText) {
      formData.append("sourceText", source.sourceText);
    }

    const timeoutMs = resolveAiDraftTimeoutMs(source);
    const isPdfSource =
      String(source?.sourceFile?.type || "").toLowerCase() ===
      "application/pdf";

    const controller = new AbortController();
    let timeoutTriggered = false;
    const startedAt = Date.now();
    const timeoutId = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(`${API_URL}/products/${id}/ai-draft`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal,
      });

      const rawBody = await response.text();
      let data = {};

      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch (error) {
        data = {
          success: false,
          message: rawBody || "Unexpected response from server",
        };
      }

      return {
        ...data,
        success: response.ok && data?.success !== false,
      };
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      const looksLikeTimeout =
        timeoutTriggered ||
        error?.name === "AbortError" ||
        elapsedMs >= timeoutMs - 1000;

      if (looksLikeTimeout) {
        throw new Error(
          `Draft generation timed out after ${Math.round(timeoutMs / 1000)} seconds. ${isPdfSource ? "PDF extraction can take longer; try again or increase REACT_APP_AI_DRAFT_TIMEOUT_PDF_MS." : "Try shorter source text/file or click Generate again."}`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  // Get AI/PDF generator readiness for admin draft creation
  getDraftStatus: (token) =>
    apiCall("/products/ai-status", {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ==================== Contact Form API ====================
export const contact = {
  // Submit contact form
  submit: (formData) =>
    apiCall("/contact", {
      method: "POST",
      body: JSON.stringify(formData),
    }),

  // Get all contact submissions (Admin only)
  getAll: (token) =>
    apiCall("/contact", {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ==================== File Upload API ====================
export const uploads = {
  // Upload single image
  uploadImage: (file, token) => {
    const formData = new FormData();
    formData.append("image", file);

    return fetch(`${API_URL}/uploads/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((res) => res.json());
  },

  // Upload multiple images
  uploadImages: (files, token) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    return fetch(`${API_URL}/uploads/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((res) => res.json());
  },

  // Upload datasheet (PDF)
  uploadDatasheet: (file, token) => {
    const formData = new FormData();
    formData.append("datasheet", file);

    return fetch(`${API_URL}/uploads/datasheet`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((res) => res.json());
  },
};

// ==================== AI Chat Assistant API ====================
export const chat = {
  // Send message to AI assistant
  sendMessage: async (message) => {
    try {
      // Option 1: Use your backend API
      const response = await apiCall("/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      return response;
    } catch (error) {
      // If backend is not available, throw error to use fallback in component
      throw error;
    }
  },

  // Alternative: Direct OpenAI API call (if you have API key)
  // Uncomment this if you want to use OpenAI directly from frontend
  /*
  sendMessageOpenAI: async (message) => {
    const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant for ARIHAAN ENTERPRISES, a premium PPE supplier. Help customers with information about products, brands, industries, and services.'
            },
            {
              role: 'user',
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      const data = await response.json();
      return {
        message: data.choices[0].message.content,
        success: true
      };
    } catch (error) {
      throw error;
    }
  }
  */
};

// ==================== Example Usage ====================

/*
// EXAMPLE 1: Login
import { auth } from './services/api';

const handleLogin = async () => {
  const result = await auth.login('admin@arihaanenterprises.com', 'admin123');
  if (result.success) {
    localStorage.setItem('token', result.token);
    console.log('Logged in!', result.user);
  }
};

// EXAMPLE 2: Get Products
import { products } from './services/api';

const loadProducts = async () => {
  const data = await products.getAll();
  if (data.success) {
    console.log('Products:', data.products);
  }
};

// EXAMPLE 3: Get Products with Filters
const loadFilteredProducts = async () => {
  const data = await products.getAll({ 
    category: 'head-hearing-protection',
    brand: '3M'
  });
  console.log('Filtered Products:', data.products);
};

// EXAMPLE 4: Submit Contact Form
import { contact } from './services/api';

const submitForm = async (formData) => {
  const result = await contact.submit(formData);
  if (result.success) {
    alert('Message sent!');
  }
};

// EXAMPLE 5: Add Product (Admin)
const addProduct = async () => {
  const token = localStorage.getItem('token');
  const productData = {
    name: "3M Safety Helmet",
    category: "head-hearing-protection",
    brand: "3M",
    description: "...",
    price: 450,
    stock: 100
  };
  
  const result = await products.create(productData, token);
  if (result.success) {
    console.log('Product added!', result.product);
  }
};

// EXAMPLE 6: AI Chat Assistant
import { chat } from './services/api';

const sendChatMessage = async (userMessage) => {
  try {
    const result = await chat.sendMessage(userMessage);
    console.log('AI Response:', result.message);
  } catch (error) {
    console.log('Using fallback response');
  }
};
*/

const apiService = { auth, products, contact, uploads, chat };

export default apiService;
