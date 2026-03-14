const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)
app.use("/uploads", express.static("public/uploads"));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/contact", require("./routes/contact"));
app.use("/api/uploads", require("./routes/uploads"));

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "ARIHAAN ENTERPRISES API Server",
    status: "Running",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth (register, login, me)",
      products: "/api/products (CRUD operations)",
      contact: "/api/contact (contact form)",
    },
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

// Start server
const PORT = process.env.PORT || 5000;
const HTTP_REQUEST_TIMEOUT_MS = toPositiveInteger(
  process.env.HTTP_REQUEST_TIMEOUT_MS,
  600000,
);
const HTTP_HEADERS_TIMEOUT_MS = toPositiveInteger(
  process.env.HTTP_HEADERS_TIMEOUT_MS,
  HTTP_REQUEST_TIMEOUT_MS + 10000,
);
const HTTP_KEEP_ALIVE_TIMEOUT_MS = toPositiveInteger(
  process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS,
  65000,
);

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`⏱️ HTTP request timeout: ${HTTP_REQUEST_TIMEOUT_MS}ms\n`);
});

server.requestTimeout = HTTP_REQUEST_TIMEOUT_MS;
server.headersTimeout = Math.max(
  HTTP_HEADERS_TIMEOUT_MS,
  HTTP_REQUEST_TIMEOUT_MS + 1000,
);
server.keepAliveTimeout = HTTP_KEEP_ALIVE_TIMEOUT_MS;
