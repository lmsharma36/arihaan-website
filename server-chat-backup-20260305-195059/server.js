// server.js
// ARIHAAN ENTERPRISES - AI Chat Assistant Backend
// Main server file

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const os = require("os");

// Import routes
const chatRoutes = require("./routes/chat");

// Initialize Express app
const app = express();

const getLocalNetworkUrls = (port) => {
  const interfaces = os.networkInterfaces();
  return Object.values(interfaces)
    .flat()
    .filter(
      (details) => details && details.family === "IPv4" && !details.internal,
    )
    .map((details) => `http://${details.address}:${port}`);
};

// Middleware
app.use(helmet()); // Security headers
app.use(morgan("dev")); // Logging
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      // Allow any origin from the same network
      callback(null, true);
    },
    credentials: true,
  }),
); // Enable CORS
app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "ARIHAAN ENTERPRISES AI Backend is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/chat", chatRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0"; // Listen on all network interfaces
app.listen(PORT, HOST, () => {
  const networkUrls = getLocalNetworkUrls(PORT);
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   ARIHAAN ENTERPRISES - AI Chat Backend                  ║
║   Server running on ${HOST}:${PORT}                       ║
║   Environment: ${process.env.NODE_ENV || "development"}                        ║
╚═══════════════════════════════════════════════════════════╝
  `);

  if (networkUrls.length > 0) {
    console.log("Accessible on network:");
    networkUrls.forEach((url) => console.log(`- ${url}`));
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received. Shutting down gracefully...");
  process.exit(0);
});

module.exports = app;
