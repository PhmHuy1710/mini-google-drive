// Upload Manager Module
class UploadManager {
  constructor() {
    this.uploadQueue = [];
    this.isUploading = false;
    this.maxFileSize = 5 * 1024 * 1024 * 1024;
    this.maxFiles = 10;
    this.setupDragDrop();
    this.loadUploadConfig();
  }

  // Load upload configuration from server
  async loadUploadConfig() {
    try {
      const response = await fetch("/api/upload-config");
      if (response.ok) {
        const config = await response.json();
        this.maxFileSize = config.maxFileSize;
        this.maxFiles = config.maxFiles;
        console.log(
          `📋 Upload config loaded: ${config.maxFileSizeMB}MB max, ${config.maxFiles} files max`
        );
      } else {
        console.warn("Failed to load upload config, using defaults");
      }
    } catch (error) {
      console.warn("Error loading upload config:", error);
    }
  }

  // Check file size before upload
  validateFileSize(file) {
    if (file.size > this.maxFileSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const limitMB = (this.maxFileSize / (1024 * 1024)).toFixed(0);
      showToast(
        `File "${file.name}" (${sizeMB}MB) vượt quá giới hạn ${limitMB}MB!`,
        "error"
      );
      return false;
    }
    return true;
  }

  // Check total number of files with smart suggestions
  validateFileCount(files, isFolder = false) {
    if (files.length > this.maxFiles) {
      if (isFolder) {
        // Smart suggestion for folders
        showToast(
          `Thư mục có ${files.length} files (vượt quá giới hạn ${this.maxFiles} files). 
          💡 Gợi ý: Nén thư mục thành ZIP để upload dễ dàng hơn!`,
          "warning"
        );

        // Show additional helpful message after a delay
        setTimeout(() => {
          showToast(
            "📦 Bạn có thể sử dụng WinRAR, 7-Zip hoặc công cụ nén khác để tạo file ZIP.",
            "info"
          );
        }, 1500);
      } else {
        // Regular file count error
        showToast(
          `Chỉ được upload tối đa ${this.maxFiles} files cùng lúc! Bạn đã chọn ${files.length} files.`,
          "error"
        );
      }
      return false;
    }
    return true;
  }

  async uploadFiles(files, folderId, basePath = "", isFromFolder = false) {
    this.isUploading = true;

    try {
      console.log(`📤 Starting upload of ${files.length} files...`);

      // Validate file count with folder context
      if (!this.validateFileCount(files, isFromFolder)) {
        return;
      }

      // Validate all files first
      const validFiles = [];
      for (const file of files) {
        if (this.validateFileSize(file)) {
          validFiles.push(file);
        }
      }

      if (validFiles.length === 0) {
        showToast("Không có file nào hợp lệ để upload!", "error");
        return;
      }

      if (validFiles.length < files.length) {
        showToast(
          `Chỉ upload ${validFiles.length}/${files.length} file hợp lệ`,
          "warning"
        );
      }

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];

        try {
          // Log original filename for debugging UTF-8 issues
          console.log(
            `📁 Uploading file ${i + 1}/${validFiles.length}:`,
            file.name
          );

          const formData = new FormData();
          formData.append("file", file);

          if (file.webkitRelativePath) {
            formData.append("relativePath", file.webkitRelativePath);
          } else if (basePath) {
            formData.append("relativePath", basePath + file.name);
          }

          if (folderId) formData.append("parentId", folderId);

          const result = await this.uploadWithProgress(
            formData,
            file.name,
            i,
            validFiles.length
          );
          console.log(`✅ Successfully uploaded: ${file.name}`, result);

          // Refresh file list after successful upload
          try {
            await fileManager.renderFiles(fileManager.currentFolderId);
          } catch (renderError) {
            console.error(
              "Error refreshing file list after upload:",
              renderError
            );
            // Don't fail the whole upload for render errors
          }
        } catch (uploadError) {
          console.error(`❌ Failed to upload ${file.name}:`, uploadError);
          // Continue with next file instead of stopping entire batch
          showToast(`Lỗi upload ${file.name}: ${uploadError.message}`, "error");
        }
      }

      console.log("📤 Batch upload completed");
    } catch (error) {
      console.error("❌ Critical error in upload batch:", error);
      showToast("Lỗi nghiêm trọng trong quá trình upload!", "error");
    } finally {
      this.isUploading = false;
    }
  }

  uploadFileList(fileList, folderId) {
    if (!fileList || !fileList.length) return;

    // Handle async upload properly (regular files)
    this.uploadFiles(Array.from(fileList), folderId, "", false).catch(error => {
      console.error("Error in uploadFileList:", error);
      showToast("Lỗi upload danh sách file!", "error");
    });
  }

  uploadFolder(fileList, folderId) {
    if (!fileList || !fileList.length) return;

    // Handle async upload properly (folder files)
    this.uploadFiles(Array.from(fileList), folderId, "", true).catch(error => {
      console.error("Error in uploadFolder:", error);
      showToast("Lỗi upload thư mục!", "error");
    });
  }

  uploadWithProgress(formData, fileName, index, total) {
    return new Promise((resolve, reject) => {
      const progressWrap = document.getElementById("progressWrap");
      const progressBar = document.getElementById("progressBar");
      const progressText = document.getElementById("progressText");

      progressWrap.style.display = "flex";
      progressBar.style.width = "0%";
      progressText.textContent = `Đang tải lên: ${fileName} (${
        index + 1
      }/${total})`;

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload", true);

      // Set timeout for large files (10 minutes)
      xhr.timeout = 10 * 60 * 1000;

      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded * 100) / e.total);
          progressBar.style.width = percent + "%";
          progressText.textContent = `${percent}% - ${fileName} (${
            index + 1
          }/${total})`;
        }
      };

      xhr.onload = function () {
        progressWrap.style.display = "none";
        try {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            showToast("Tải lên thành công!", "success");
            resolve(response);
          } else {
            let errorMsg = "Tải lên thất bại!";
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMsg =
                errorResponse.error || errorResponse.message || errorMsg;
            } catch (e) {
              errorMsg = `HTTP ${xhr.status}: ${xhr.statusText}`;
            }

            console.error(`Upload failed for ${fileName}:`, errorMsg);
            showToast(errorMsg, "error");
            reject(new Error(errorMsg));
          }
        } catch (error) {
          console.error(`Upload parsing error for ${fileName}:`, error);
          showToast("Lỗi xử lý phản hồi upload!", "error");
          reject(new Error(`Response parsing error: ${error.message}`));
        }
      };

      xhr.onerror = function () {
        progressWrap.style.display = "none";
        const errorMsg = `Network error uploading ${fileName}`;
        console.error(errorMsg);
        showToast("Lỗi mạng khi upload!", "error");
        reject(new Error(errorMsg));
      };

      xhr.ontimeout = function () {
        progressWrap.style.display = "none";
        const errorMsg = `Upload timeout for ${fileName} (exceeded 10 minutes)`;
        console.error(errorMsg);
        showToast("Upload quá thời gian cho phép!", "error");
        reject(new Error(errorMsg));
      };

      xhr.onabort = function () {
        progressWrap.style.display = "none";
        const errorMsg = `Upload aborted for ${fileName}`;
        console.error(errorMsg);
        showToast("Upload bị hủy!", "error");
        reject(new Error(errorMsg));
      };

      try {
        xhr.send(formData);
      } catch (error) {
        progressWrap.style.display = "none";
        console.error(`Failed to send upload for ${fileName}:`, error);
        showToast("Lỗi khởi tạo upload!", "error");
        reject(new Error(`Send error: ${error.message}`));
      }
    });
  }

  setupDragDrop() {
    const dropArea = document.getElementById("dropArea");
    let dragTimeout = null;

    ["dragenter", "dragover"].forEach(eventName => {
      window.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(dragTimeout);
        dropArea.style.display = "flex";
        dropArea.classList.add("drop-area-show");
      });
    });

    ["dragleave", "drop"].forEach(eventName => {
      window.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
        dragTimeout = setTimeout(() => {
          dropArea.classList.remove("drop-area-show");
          dropArea.style.display = "none";
        }, 120);
      });
    });

    dropArea.addEventListener("drop", e => {
      e.preventDefault();
      dropArea.style.display = "none";
      dropArea.classList.remove("drop-area-show");

      let items = e.dataTransfer.items;
      let files = [];

      if (items && items.length > 0) {
        let hasDir = false;
        for (let i = 0; i < items.length; i++) {
          let entry = items[i].webkitGetAsEntry && items[i].webkitGetAsEntry();
          if (entry && entry.isDirectory) hasDir = true;
        }

        if (hasDir) {
          let entry = items[0].webkitGetAsEntry && items[0].webkitGetAsEntry();
          showToast("Đang xử lý thư mục...", "info");

          fetch("/api/create-folder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: entry.name,
              parentId: fileManager.currentFolderId,
            }),
          })
            .then(res => res.json())
            .then(newFolder => {
              let folderFiles = [];
              this.getAllFilesFromEntry(entry, "", folderFiles, () => {
                folderFiles.forEach(file => {
                  file.webkitRelativePath =
                    entry.name + "/" + file.webkitRelativePath;
                });
                // Handle upload promise properly (folder from drag&drop)
                this.uploadFiles(folderFiles, newFolder.id, "", true).catch(
                  error => {
                    console.error("Error uploading folder files:", error);
                    showToast("Lỗi upload file trong thư mục!", "error");
                  }
                );
              });
            })
            .catch(error => {
              console.error("Error creating folder for drag & drop:", error);
              showToast("Lỗi tạo thư mục!", "error");
            });
        } else {
          // Only files
          let total = items.length;
          let collected = 0;

          for (let i = 0; i < items.length; i++) {
            let entry =
              items[i].webkitGetAsEntry && items[i].webkitGetAsEntry();
            if (entry && entry.isFile) {
              entry.file(file => {
                files.push(file);
                collected++;
                if (collected === total) {
                  showToast("Đang xử lý tệp...", "info");
                  this.uploadFiles(
                    files,
                    fileManager.currentFolderId,
                    "",
                    false
                  ).catch(error => {
                    console.error("Error uploading dropped files:", error);
                    showToast("Lỗi upload file đã thả!", "error");
                  });
                }
              });
            } else if (items[i].getAsFile) {
              files.push(items[i].getAsFile());
              collected++;
              if (collected === total) {
                showToast("Đang xử lý tệp...", "info");
                this.uploadFiles(
                  files,
                  fileManager.currentFolderId,
                  "",
                  false
                ).catch(error => {
                  console.error(
                    "Error uploading dropped files (alternative path):",
                    error
                  );
                  showToast("Lỗi upload file đã thả!", "error");
                });
              }
            }
          }
        }
      } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        showToast("Đang xử lý tệp...", "info");
        this.uploadFiles(
          Array.from(e.dataTransfer.files),
          fileManager.currentFolderId,
          "",
          false
        ).catch(error => {
          console.error("Error uploading dropped files (direct files):", error);
          showToast("Lỗi upload file đã thả!", "error");
        });
      }
    });
  }

  getAllFilesFromEntry(entry, path, files, cb) {
    if (entry.isFile) {
      entry.file(file => {
        file.webkitRelativePath = path + entry.name;
        files.push(file);
        cb && cb();
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      dirReader.readEntries(entries => {
        let i = 0;
        function next() {
          if (i < entries.length) {
            this.getAllFilesFromEntry(
              entries[i],
              path + entry.name + "/",
              files,
              next.bind(this)
            );
            i++;
          } else {
            cb && cb();
          }
        }
        next.call(this);
      });
    }
  }
}

// Export instance
const uploadManager = new UploadManager();
