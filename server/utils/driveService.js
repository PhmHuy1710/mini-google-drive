const { google } = require("googleapis");
const config = require("../config/config");

class DriveService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );

    this.oauth2Client.setCredentials({
      refresh_token: config.google.refreshToken,
    });

    this.drive = google.drive({
      version: "v3",
      auth: this.oauth2Client,
    });

    this.uploadRootFolderId = null;
  }

  async ensureUploadRoot() {
    if (this.uploadRootFolderId) return this.uploadRootFolderId;

    try {
      const res = await this.drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and name='UploadServer' and trashed=false",
        fields: "files(id, name)",
        spaces: "drive",
      });

      if (res.data.files.length > 0) {
        this.uploadRootFolderId = res.data.files[0].id;
        return this.uploadRootFolderId;
      } else {
        const folderMeta = {
          name: "UploadServer",
          mimeType: "application/vnd.google-apps.folder",
        };

        const folder = await this.drive.files.create({
          resource: folderMeta,
          fields: "id",
        });

        this.uploadRootFolderId = folder.data.id;
        return this.uploadRootFolderId;
      }
    } catch (error) {
      console.error("Error ensuring upload root:", error);
      throw error;
    }
  }

  async getOrCreateFolderByPath(folderPath, parentId) {
    let currentParent = parentId;
    if (!folderPath) return currentParent;

    const parts = folderPath.split("/").filter(Boolean);

    for (const part of parts) {
      try {
        const res = await this.drive.files.list({
          q: `'${currentParent}' in parents and mimeType='application/vnd.google-apps.folder' and name='${part.replace(
            /'/g,
            "\\'"
          )}' and trashed=false`,
          fields: "files(id, name)",
          spaces: "drive",
        });

        if (res.data.files.length > 0) {
          currentParent = res.data.files[0].id;
        } else {
          const folderMeta = {
            name: part,
            mimeType: "application/vnd.google-apps.folder",
            parents: [currentParent],
          };

          const folder = await this.drive.files.create({
            resource: folderMeta,
            fields: "id",
          });

          currentParent = folder.data.id;
        }
      } catch (error) {
        console.error(`Error creating/finding folder ${part}:`, error);
        throw error;
      }
    }

    return currentParent;
  }

  async getOrCreateShareLink(fileId) {
    try {
      // Check current permissions
      const perms = await this.drive.permissions.list({ fileId });
      let hasAnyone =
        perms.data.permissions &&
        perms.data.permissions.some(
          p =>
            p.type === "anyone" && (p.role === "reader" || p.role === "writer")
        );

      if (!hasAnyone) {
        try {
          await this.drive.permissions.create({
            fileId,
            requestBody: { role: "reader", type: "anyone" },
            fields: "id",
          });

          // Wait for Google to sync permissions
          await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
          if (!String(err).includes("alreadyExists")) {
            console.error(
              "Permission creation error:",
              err?.errors || err?.message
            );
          }
        }
      }

      // Get webViewLink
      for (let i = 0; i < 3; i++) {
        const meta = await this.drive.files.get({
          fileId,
          fields: "webViewLink, permissions",
        });

        const anyonePerm = (meta.data.permissions || []).some(
          p =>
            p.type === "anyone" && (p.role === "reader" || p.role === "writer")
        );

        if (anyonePerm) return meta.data.webViewLink;
        await new Promise(r => setTimeout(r, 600));
      }

      const meta = await this.drive.files.get({
        fileId,
        fields: "webViewLink",
      });

      return meta.data.webViewLink;
    } catch (error) {
      console.error("Error creating share link:", error);
      throw error;
    }
  }

  async getStorageQuota() {
    try {
      const about = await this.drive.about.get({ fields: "storageQuota" });
      return about.data.storageQuota;
    } catch (error) {
      console.error("Error getting storage quota:", error);
      throw error;
    }
  }

  async listFiles(parentId, paginationOptions = {}) {
    try {
      const rootId = await this.ensureUploadRoot();
      const actualParentId = parentId || rootId;

      // Extract pagination options with defaults
      const {
        page = 1,
        limit = 100,
        sortBy = "name",
        sortOrder = "asc",
      } = paginationOptions;

      // Build Google Drive API orderBy parameter
      let orderBy = "folder"; // Always sort folders first

      // Add secondary sort based on user preference
      if (sortBy === "name") {
        orderBy += ",name";
      } else if (sortBy === "modifiedTime") {
        orderBy += ",modifiedTime";
      } else if (sortBy === "size") {
        orderBy += ",quotaBytesUsed"; // Google Drive API field for file size
      }

      // Add sort direction
      if (sortOrder === "desc") {
        orderBy += " desc";
      }

      // For pagination, we need to fetch all files first, then paginate
      // Google Drive API doesn't support offset-based pagination directly
      const result = await this.drive.files.list({
        q: `'${actualParentId}' in parents and trashed=false`,
        fields:
          "files(id, name, modifiedTime, size, mimeType, webViewLink, parents)",
        spaces: "drive",
        orderBy: orderBy,
        pageSize: 1000, // Fetch up to 1000 files (Google Drive limit)
      });

      // Process all files first
      const allFiles = await Promise.all(
        (result.data.files || []).map(async f => {
          const isFolder = f.mimeType === "application/vnd.google-apps.folder";
          let shareLink = f.webViewLink;

          if (!isFolder && !shareLink) {
            shareLink = await this.getOrCreateShareLink(f.id);
          }

          return {
            ...f,
            isFolder,
            shareLink,
            parentId: f.parents ? f.parents[0] : null,
          };
        })
      );

      // Apply client-side sorting if needed (for more complex sorting)
      let sortedFiles = [...allFiles];

      if (sortBy === "name") {
        sortedFiles.sort((a, b) => {
          // Folders first, then files
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;

          const nameA = (a.name || "").toLowerCase();
          const nameB = (b.name || "").toLowerCase();

          return sortOrder === "asc"
            ? nameA.localeCompare(nameB, "vi", { numeric: true })
            : nameB.localeCompare(nameA, "vi", { numeric: true });
        });
      } else if (sortBy === "modifiedTime") {
        sortedFiles.sort((a, b) => {
          // Folders first, then files
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;

          const timeA = new Date(a.modifiedTime || 0);
          const timeB = new Date(b.modifiedTime || 0);

          return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
        });
      } else if (sortBy === "size") {
        sortedFiles.sort((a, b) => {
          // Folders first, then files
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;

          const sizeA = parseInt(a.size || 0);
          const sizeB = parseInt(b.size || 0);

          return sortOrder === "asc" ? sizeA - sizeB : sizeB - sizeA;
        });
      }

      // Calculate pagination
      const totalFiles = sortedFiles.length;
      const totalPages = Math.ceil(totalFiles / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      // Get files for current page
      const paginatedFiles = sortedFiles.slice(startIndex, endIndex);

      // Return pagination response format
      const response = {
        files: paginatedFiles,
        pagination: {
          totalFiles,
          totalPages,
          currentPage: page,
          limit,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          startIndex: startIndex + 1,
          endIndex: Math.min(endIndex, totalFiles),
        },
      };

      // If no pagination was requested, return legacy format
      if (
        page === 1 &&
        limit >= 100 &&
        Object.keys(paginationOptions).length === 0
      ) {
        return sortedFiles; // Legacy format for backward compatibility
      }

      return response;
    } catch (error) {
      console.error("Error listing files:", error);
      throw error;
    }
  }

  async getFolderInfo(folderId) {
    try {
      const result = await this.drive.files.get({
        fileId: folderId,
        fields: "id, name, parents, mimeType",
      });

      const isFolder =
        result.data.mimeType === "application/vnd.google-apps.folder";

      return {
        id: result.data.id,
        name: result.data.name,
        parentId: result.data.parents ? result.data.parents[0] : null,
        isFolder: isFolder,
        mimeType: result.data.mimeType,
      };
    } catch (error) {
      console.error("Error getting folder info:", error);
      throw error;
    }
  }

  async createFolder(name, parentId) {
    try {
      const rootId = await this.ensureUploadRoot();
      const actualParentId = parentId || rootId;

      // Check if folder already exists
      const existed = await this.drive.files.list({
        q: `'${actualParentId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${name.replace(
          /'/g,
          "\\'"
        )}' and trashed=false`,
        fields: "files(id, name)",
        spaces: "drive",
      });

      if (existed.data.files.length > 0) {
        return {
          id: existed.data.files[0].id,
          name: existed.data.files[0].name,
        };
      }

      const folderMeta = {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [actualParentId],
      };

      const folder = await this.drive.files.create({
        resource: folderMeta,
        fields: "id, name",
      });

      return {
        id: folder.data.id,
        name: folder.data.name,
      };
    } catch (error) {
      console.error("Error creating folder:", error);
      throw error;
    }
  }

  async uploadFile(fileStream, fileName, mimeType, parentId, relativePath) {
    try {
      const rootId = await this.ensureUploadRoot();
      let actualParentId = parentId || rootId;

      // Handle relative path
      let folderPath = "";
      if (relativePath) {
        const parts = relativePath.split("/");
        if (parts.length > 1) {
          folderPath = parts.slice(0, -1).join("/");
        }
      }

      if (folderPath) {
        actualParentId = await this.getOrCreateFolderByPath(
          folderPath,
          actualParentId
        );
      }

      // Check if file already exists (for overwrite)
      const existed = await this.drive.files.list({
        q: `'${actualParentId}' in parents and name='${fileName.replace(
          /'/g,
          "\\'"
        )}' and trashed=false`,
        fields: "files(id)",
        spaces: "drive",
      });

      let fileId = null;

      if (existed.data.files.length > 0) {
        // Update existing file
        fileId = existed.data.files[0].id;
        await this.drive.files.update({
          fileId,
          media: {
            mimeType,
            body: fileStream,
          },
        });
      } else {
        // Create new file
        const fileMeta = {
          name: fileName,
          parents: [actualParentId],
        };

        const media = {
          mimeType,
          body: fileStream,
        };

        const driveRes = await this.drive.files.create({
          resource: fileMeta,
          media,
          fields: "id",
        });

        fileId = driveRes.data.id;
      }

      // Get share link
      const shareLink = await this.getOrCreateShareLink(fileId);

      return {
        id: fileId,
        name: fileName,
        shareLink,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }

  async downloadFile(fileId) {
    try {
      const meta = await this.drive.files.get({
        fileId,
        fields: "name",
      });

      const driveRes = await this.drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

      return {
        fileName: meta.data.name,
        stream: driveRes.data,
      };
    } catch (error) {
      console.error("Error downloading file:", error);
      throw error;
    }
  }

  // Soft delete - move to trash instead of permanent delete
  async deleteFile(fileId) {
    try {
      await this.drive.files.update({
        fileId,
        resource: { trashed: true },
      });
      return { success: true };
    } catch (error) {
      console.error("Error moving file to trash:", error);
      throw error;
    }
  }

  // Get all trashed files
  async getTrashedFiles() {
    try {
      console.log("🗑️ Getting trashed files from Google Drive...");

      // Try different approaches to get trashed files
      const queries = ["trashed=true", "trashed = true", "trashed:true"];

      for (let i = 0; i < queries.length; i++) {
        try {
          console.log(`Trying query ${i + 1}: "${queries[i]}"`);

          const result = await this.drive.files.list({
            q: queries[i],
            fields: "files(id, name, modifiedTime, size, mimeType, parents)",
            pageSize: 100,
            includeItemsFromAllDrives: false,
            supportsAllDrives: false,
          });

          console.log(
            `✅ Query ${i + 1} successful! Found ${
              result.data.files?.length || 0
            } trashed files`
          );

          const files = (result.data.files || []).map(f => {
            const isFolder =
              f.mimeType === "application/vnd.google-apps.folder";
            return {
              ...f,
              isFolder,
              parentId: f.parents ? f.parents[0] : null,
              trashedTime: f.modifiedTime, // Use modifiedTime as approximation
            };
          });

          return files;
        } catch (queryError) {
          console.log(`❌ Query ${i + 1} failed:`, queryError.message);
          if (i === queries.length - 1) {
            // If all queries fail, throw the last error
            throw queryError;
          }
        }
      }
    } catch (error) {
      console.error("❌ All trashed file queries failed:", error.message);

      // Return empty array as fallback instead of throwing
      console.log("🔄 Returning empty array as fallback");
      return [];
    }
  }

  // Restore file from trash
  async restoreFile(fileId) {
    try {
      console.log(`🔄 Restoring file from trash: ${fileId}`);

      await this.drive.files.update({
        fileId,
        resource: { trashed: false },
      });

      console.log(`✅ Successfully restored file: ${fileId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error restoring file ${fileId}:`, error.message);
      throw error;
    }
  }

  // Permanently delete file
  async permanentlyDeleteFile(fileId) {
    try {
      console.log(`🗑️ Permanently deleting file: ${fileId}`);

      await this.drive.files.delete({ fileId });

      console.log(`✅ Successfully permanently deleted file: ${fileId}`);
      return { success: true };
    } catch (error) {
      console.error(
        `❌ Error permanently deleting file ${fileId}:`,
        error.message
      );
      throw error;
    }
  }

  // Empty entire trash
  async emptyTrash() {
    try {
      const trashedFiles = await this.getTrashedFiles();
      const deletePromises = trashedFiles.map(file =>
        this.permanentlyDeleteFile(file.id)
      );

      await Promise.all(deletePromises);
      return {
        success: true,
        deletedCount: trashedFiles.length,
      };
    } catch (error) {
      console.error("Error emptying trash:", error);
      throw error;
    }
  }

  async renameFile(fileId, newName) {
    try {
      const result = await this.drive.files.update({
        fileId,
        resource: { name: newName },
        fields: "id, name",
      });

      return {
        id: result.data.id,
        name: result.data.name,
      };
    } catch (error) {
      console.error("Error renaming file:", error);
      throw error;
    }
  }

  async searchFiles(query) {
    try {
      const rootId = await this.ensureUploadRoot();

      // Search in the UploadServer folder and its subfolders
      const searchQuery = `name contains '${query.replace(
        /'/g,
        "\\'"
      )}' and trashed=false`;

      const result = await this.drive.files.list({
        q: searchQuery,
        fields:
          "files(id, name, modifiedTime, size, mimeType, webViewLink, parents)",
        spaces: "drive",
        pageSize: 100,
      });

      const files = await Promise.all(
        (result.data.files || []).map(async f => {
          const isFolder = f.mimeType === "application/vnd.google-apps.folder";
          let shareLink = f.webViewLink;

          if (!isFolder && !shareLink) {
            shareLink = await this.getOrCreateShareLink(f.id);
          }

          // Get folder path for display
          let path = "";
          if (f.parents && f.parents[0] !== rootId) {
            try {
              const parentInfo = await this.getFolderInfo(f.parents[0]);
              path = `${parentInfo.name}/`;
            } catch (e) {
              // Parent might be deleted or inaccessible
            }
          }

          return {
            ...f,
            isFolder,
            shareLink,
            parentId: f.parents ? f.parents[0] : null,
            path,
          };
        })
      );

      return files;
    } catch (error) {
      console.error("Error searching files:", error);
      throw error;
    }
  }
}

module.exports = new DriveService();
