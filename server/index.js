const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const config = require("./config/config");
const fileRoutes = require("./routes/fileRoutes");

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
        connectSrc: [
          "'self'",
          "https://mini-google-drive.vercel.app",
          "https://*.vercel.app",
        ],
      },
    },
  })
);

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://mini-google-drive.vercel.app", "https://*.vercel.app"]
        : true,
    credentials: true,
  })
);

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: "Too many requests, please try again later.",
  },
});
app.use("/api/", limiter);

// Body parsing middleware with UTF-8 support
app.use(express.json({ limit: "10gb" }));
app.use(express.urlencoded({ extended: true, limit: "10gb" }));

// Set default charset to UTF-8
app.use((req, res, next) => {
  res.charset = "utf-8";
  next();
});

// Session middleware
app.use(
  session({
    secret: config.server.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.server.nodeEnv === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Create temp directory if it doesn't exist
// Use /tmp for Vercel serverless functions, local path for development
const tempDir = config.server.isVercel
  ? "/tmp"
  : path.join(__dirname, "../temp");

if (!config.server.isVercel && !fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// API routes
app.use("/api", fileRoutes);

// Serve static files from client directory
app.use(express.static(path.join(__dirname, "../client")));

// Serve main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Let fileRoutes.js handle Multer errors
  if (err instanceof multer.MulterError) {
    return next(err);
  }

  res.status(500).json({
    error: "Internal server error",
    message:
      config.server.nodeEnv === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    message: "The requested resource was not found",
  });
});

// Start server (only if not running on Vercel)
if (!config.server.isVercel) {
  const PORT = config.server.port;
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `🚀 Mini Google Drive server running at http://0.0.0.0:${PORT}`
    );
    console.log(`📁 Environment: ${config.server.nodeEnv}`);
    console.log(`🔒 Security features enabled`);
  });

  // Set server timeout for large file uploads (15 minutes)
  server.timeout = 15 * 60 * 1000;
  server.keepAliveTimeout = 10 * 60 * 1000;
  server.headersTimeout = 10 * 60 * 1000;

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received. Shutting down gracefully...");
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  });
} else {
  console.log(`🚀 Mini Google Drive running on Vercel`);
  console.log(`📁 Environment: ${config.server.nodeEnv}`);
  console.log(`🔒 Security features enabled`);
}

// Export app for Vercel
module.exports = app;
