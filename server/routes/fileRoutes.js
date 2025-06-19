const express = require("express");
const multer = require("multer");
const { body, param, query, validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");

const driveService = require("../utils/driveService");
const config = require("../config/config");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: config.upload.tempDir, // Use absolute path from config
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles,
  },
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array(),
    });
  }
  next();
};

// GET /api/storage - Get storage quota
router.get("/storage", async (req, res) => {
  try {
    const quota = await driveService.getStorageQuota();
    res.json(quota);
  } catch (error) {
    res.status(500).json({
      error: "Failed to get storage information",
      detail: error.message,
    });
  }
});

// GET /api/upload-config - Get upload configuration
router.get("/upload-config", (req, res) => {
  try {
    res.json({
      maxFileSize: config.upload.maxFileSize,
      maxFiles: config.upload.maxFiles,
      maxFileSizeMB: Math.round(config.upload.maxFileSize / (1024 * 1024)),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get upload configuration",
      detail: error.message,
    });
  }
});

// GET /api/files - List files in a folder
router.get(
  "/files",
  [query("parentId").optional().isString().trim()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const files = await driveService.listFiles(req.query.parentId);

      // Ensure UTF-8 encoding for response
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.json(files);
    } catch (error) {
      console.error("List files error:", error);
      res.status(500).json({
        error: "Failed to list files",
        detail: error.message,
      });
    }
  }
);

// GET /api/folderinfo/:id - Get folder information
router.get(
  "/folderinfo/:id",
  [param("id").isString().trim().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const folderInfo = await driveService.getFolderInfo(req.params.id);
      res.json(folderInfo);
    } catch (error) {
      res.status(404).json({
        error: "Folder not found",
        detail: error.message,
      });
    }
  }
);

// POST /api/create-folder - Create a new folder
router.post(
  "/create-folder",
  [
    body("name")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Folder name is required"),
    body("parentId").optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, parentId } = req.body;
      const folder = await driveService.createFolder(name, parentId);
      res.json(folder);
    } catch (error) {
      res.status(500).json({
        error: "Failed to create folder",
        detail: error.message,
      });
    }
  }
);

// POST /api/upload - Upload file(s)
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    const { parentId, relativePath } = req.body;
    const fileStream = fs.createReadStream(req.file.path);

    // Advanced UTF-8 encoding fix for Vietnamese filenames
    let fileName = req.file.originalname;
    console.log("📁 Original filename received:", fileName);

    try {
      // Detect garbled UTF-8 patterns
      const hasGarbledChars =
        /[âÃºÄÁáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵđÂÃÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴĐ]/.test(
          fileName
        );

      if (hasGarbledChars) {
        // Try different decoding strategies
        const strategies = [
          () => Buffer.from(fileName, "latin1").toString("utf8"),
          () =>
            decodeURIComponent(encodeURIComponent(fileName)).normalize("NFC"),
          () => Buffer.from(fileName, "binary").toString("utf8"),
        ];

        for (let i = 0; i < strategies.length; i++) {
          try {
            const decoded = strategies[i]();

            // Validate result
            if (
              decoded &&
              decoded.length <= fileName.length * 1.5 &&
              !decoded.includes("�") &&
              !decoded.includes("Ã") &&
              !/[âÃº]{2,}/.test(decoded)
            ) {
              fileName = decoded;
              console.log(
                `✅ Fixed filename encoding (strategy ${i + 1}): "${
                  req.file.originalname
                }" -> "${fileName}"`
              );
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (error) {
      console.log("❌ Filename encoding fix failed:", error.message);
    }

    const result = await driveService.uploadFile(
      fileStream,
      fileName,
      req.file.mimetype,
      parentId,
      relativePath
    );

    // Clean up temporary file
    fs.unlink(req.file.path, err => {
      if (err) console.error("Error deleting temp file:", err);
    });

    // Ensure UTF-8 response
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json(result);
  } catch (error) {
    // Clean up temporary file on error
    if (req.file) {
      fs.unlink(req.file.path, err => {
        if (err) console.error("Error deleting temp file:", err);
      });
    }

    res.status(500).json({
      error: "Upload failed",
      detail: error.message,
    });
  }
});

// GET /api/download/:id - Download a file
router.get(
  "/download/:id",
  [param("id").isString().trim().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { fileName, stream } = await driveService.downloadFile(
        req.params.id
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(fileName)}"`
      );
      res.setHeader("Content-Type", "application/octet-stream");

      stream.pipe(res);
    } catch (error) {
      res.status(404).json({
        error: "File not found",
        detail: error.message,
      });
    }
  }
);

// DELETE /api/delete/:id - Delete a file or folder
router.delete(
  "/delete/:id",
  [param("id").isString().trim().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await driveService.deleteFile(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: "Delete failed",
        detail: error.message,
      });
    }
  }
);

// PUT /api/rename/:id - Rename a file or folder
router.put(
  "/rename/:id",
  [
    param("id").isString().trim().notEmpty(),
    body("name")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("New name is required"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name } = req.body;
      const result = await driveService.renameFile(req.params.id, name);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: "Rename failed",
        detail: error.message,
      });
    }
  }
);

// GET /api/search - Search files and folders
router.get(
  "/search",
  [
    query("q")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Search query is required"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { q } = req.query;
      const results = await driveService.searchFiles(q);

      // Ensure UTF-8 encoding for response
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.json(results);
    } catch (error) {
      res.status(500).json({
        error: "Search failed",
        detail: error.message,
      });
    }
  }
);

// ===== RECYCLE BIN ROUTES =====

// GET /api/trash - Get all trashed files
router.get("/trash", async (req, res) => {
  try {
    const trashedFiles = await driveService.getTrashedFiles();

    // Ensure UTF-8 encoding for response
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json(trashedFiles);
  } catch (error) {
    res.status(500).json({
      error: "Failed to get trashed files",
      detail: error.message,
    });
  }
});

// POST /api/restore/:id - Restore file from trash
router.post(
  "/restore/:id",
  [param("id").isString().trim().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await driveService.restoreFile(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: "Restore failed",
        detail: error.message,
      });
    }
  }
);

// DELETE /api/permanent-delete/:id - Permanently delete file
router.delete(
  "/permanent-delete/:id",
  [param("id").isString().trim().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await driveService.permanentlyDeleteFile(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: "Permanent delete failed",
        detail: error.message,
      });
    }
  }
);

// DELETE /api/empty-trash - Empty entire trash
router.delete("/empty-trash", async (req, res) => {
  try {
    const result = await driveService.emptyTrash();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Empty trash failed",
      detail: error.message,
    });
  }
});

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      const limitMB = (config.upload.maxFileSize / (1024 * 1024)).toFixed(0);
      return res.status(400).json({
        error: "File too large",
        message: `File size exceeds the ${limitMB}MB limit`,
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: "Too many files",
        message: `Maximum ${config.upload.maxFiles} files allowed per upload`,
      });
    }
  }
  next(error);
});

module.exports = router;
