require("dotenv").config();

const config = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      "https://developers.google.com/oauthplayground",
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
  },
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || "development",
    sessionSecret:
      process.env.SESSION_SECRET || "vaicalz-production-server-tezt",
    isVercel: process.env.VERCEL === "1",
  },
  upload: {
    maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
    maxFiles: 10, // Max 10 files per request
    tempDir: "../temp/", // Relative to server directory
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
};

// Validate required environment variables
const requiredEnvVars = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Error: ${varName} is not set in environment variables`);
    process.exit(1);
  }
});

module.exports = config;
