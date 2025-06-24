const express = require("express");
const multer = require("multer");
const { body, param, query, validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

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

// GET /api/files - List files in a folder with pagination support
router.get(
  "/files",
  [
    query("parentId").optional().isString().trim(),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Limit must be between 1 and 1000"),
    query("sortBy")
      .optional()
      .isIn(["name", "modifiedTime", "size"])
      .withMessage("sortBy must be 'name', 'modifiedTime', or 'size'"),
    query("sortOrder")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("sortOrder must be 'asc' or 'desc'"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        parentId,
        page = 1,
        limit = 100, // Default to 100 files per page (no pagination by default for backward compatibility)
        sortBy = "name",
        sortOrder = "asc",
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      // Call driveService with pagination parameters
      const result = await driveService.listFiles(parentId, {
        page: pageNum,
        limit: limitNum,
        sortBy,
        sortOrder,
      });

      // Ensure UTF-8 encoding for response
      res.setHeader("Content-Type", "application/json; charset=utf-8");

      // Check if client expects paginated response or legacy format
      if (req.query.page !== undefined || req.query.limit !== undefined) {
        // Return paginated response
        res.json(result);
      } else {
        // Return legacy format for backward compatibility
        res.json(result.files || result);
      }
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

// ===== FILE OPERATIONS ROUTES =====

// POST /api/move - Move file(s) to different folder
router.post(
  "/move",
  [
    body("fileIds")
      .isArray({ min: 1 })
      .withMessage("At least one file ID is required"),
    body("fileIds.*")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each file ID must be a non-empty string"),
    body("targetFolderId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Target folder ID is required"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { fileIds, targetFolderId } = req.body;
      console.log(
        `📁 Moving ${fileIds.length} files to folder: ${targetFolderId}`
      );

      const results = await driveService.moveFiles(fileIds, targetFolderId);
      res.json({
        success: true,
        moved: results.length,
        results: results,
      });
    } catch (error) {
      console.error("Move files error:", error);
      res.status(500).json({
        error: "Failed to move files",
        detail: error.message,
      });
    }
  }
);

// POST /api/copy - Copy file(s) to different folder
router.post(
  "/copy",
  [
    body("fileIds")
      .isArray({ min: 1 })
      .withMessage("At least one file ID is required"),
    body("fileIds.*")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each file ID must be a non-empty string"),
    body("targetFolderId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Target folder ID is required"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { fileIds, targetFolderId } = req.body;
      console.log(
        `📁 Copying ${fileIds.length} files to folder: ${targetFolderId}`
      );

      const results = await driveService.copyFiles(fileIds, targetFolderId);
      res.json({
        success: true,
        copied: results.length,
        results: results,
      });
    } catch (error) {
      console.error("Copy files error:", error);
      res.status(500).json({
        error: "Failed to copy files",
        detail: error.message,
      });
    }
  }
);

// GET /api/folder-tree - Get folder tree structure for navigation
router.get("/folder-tree", async (req, res) => {
  try {
    const tree = await driveService.getFolderTree();
    res.json(tree);
  } catch (error) {
    console.error("Get folder tree error:", error);
    res.status(500).json({
      error: "Failed to get folder tree",
      detail: error.message,
    });
  }
});

// ===== RECYCLE BIN ROUTES =====

// GET /api/trash - Get all trashed files with pagination support
router.get(
  "/trash",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Limit must be between 1 and 1000"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 100, // Default to 100 files per page
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      const result = await driveService.getTrashedFiles({
        page: pageNum,
        limit: limitNum,
      });

      // Ensure UTF-8 encoding for response
      res.setHeader("Content-Type", "application/json; charset=utf-8");

      // Check if client expects paginated response or legacy format
      if (req.query.page !== undefined || req.query.limit !== undefined) {
        // Return paginated response
        res.json(result);
      } else {
        // Return legacy format for backward compatibility
        res.json(result.files || result);
      }
    } catch (error) {
      res.status(500).json({
        error: "Failed to get trashed files",
        detail: error.message,
      });
    }
  }
);

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

// ===== FOLDER DOWNLOAD ROUTES =====

// GET /api/download-folder/:id - Download folder as ZIP
router.get(
  "/download-folder/:id",
  [param("id").isString().trim().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const folderId = req.params.id;
      console.log(`📦 Starting folder ZIP download for ID: ${folderId}`);

      // Get folder info and validate it's a folder
      const folderInfo = await driveService.getFolderInfo(folderId);
      console.log(`📁 Folder info:`, folderInfo);

      if (!folderInfo) {
        console.error(`❌ Folder not found: ${folderId}`);
        return res.status(404).json({
          error: "Folder not found",
          detail: "The specified folder ID does not exist",
        });
      }

      if (!folderInfo.isFolder) {
        console.error(
          `❌ ID is not a folder: ${folderId}, mimeType: ${folderInfo.mimeType}`
        );
        return res.status(400).json({
          error: "Invalid folder",
          detail: `The specified ID is not a folder (mimeType: ${folderInfo.mimeType})`,
        });
      }

      console.log(`✅ Valid folder: ${folderInfo.name}`);

      const folderName = folderInfo.name || "folder";
      const sanitizedName = folderName.replace(/[^a-zA-Z0-9_\-\.\s]/g, "_");

      // Set response headers for ZIP download
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(sanitizedName)}.zip"`
      );

      // Create archiver instance
      const archive = archiver("zip", {
        zlib: { level: 6 }, // Compression level (0-9, 6 is good balance)
      });

      // Handle archiver warnings and errors
      archive.on("warning", err => {
        if (err.code === "ENOENT") {
          console.warn("Archive warning:", err);
        } else {
          console.error("Archive error:", err);
        }
      });

      archive.on("error", err => {
        console.error("Archive error:", err);
        if (!res.headersSent) {
          res.status(500).json({
            error: "Failed to create ZIP archive",
            detail: err.message,
          });
        }
      });

      // Pipe archive to response
      archive.pipe(res);

      // Get all files in folder recursively and add to archive
      await addFolderToArchive(archive, folderId, "");

      // Finalize archive (this will trigger the 'end' event)
      await archive.finalize();
    } catch (error) {
      console.error("Folder download error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to download folder",
          detail: error.message,
        });
      }
    }
  }
);

// Helper function to recursively add folder contents to archive
async function addFolderToArchive(archive, folderId, basePath) {
  try {
    const files = await driveService.listFiles(folderId);

    for (const file of files) {
      const filePath = basePath ? `${basePath}/${file.name}` : file.name;

      if (file.isFolder) {
        // Recursively add subfolder contents
        await addFolderToArchive(archive, file.id, filePath);
      } else {
        try {
          // Download file and add to archive
          const { fileName, stream } = await driveService.downloadFile(file.id);

          // Add file to archive with proper path
          archive.append(stream, {
            name: filePath,
            date: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
          });

          console.log(`📁 Added to ZIP: ${filePath}`);
        } catch (fileError) {
          console.error(
            `❌ Failed to add file ${file.name} to archive:`,
            fileError
          );
          // Continue with other files even if one fails
        }
      }
    }
  } catch (error) {
    console.error("Error adding folder to archive:", error);
    throw error;
  }
}

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
