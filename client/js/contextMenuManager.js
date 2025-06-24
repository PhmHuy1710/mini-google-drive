// Context Menu Manager Module
class ContextMenuManager {
  constructor() {
    this.contextMenu = null;
    this.currentTarget = null;
    this.currentFile = null;
    this.isVisible = false;
    this.fallbackWarningShown = false;

    this.init();
  }

  init() {
    this.contextMenu = document.getElementById("contextMenu");

    if (!this.contextMenu) {
      console.warn("Context menu element not found");
      return;
    }

    this.setupEventListeners();
    console.log("🖱️ Context Menu Manager initialized");
  }

  setupEventListeners() {
    // Right-click event delegation
    document.addEventListener("contextmenu", e => {
      this.handleContextMenu(e);
    });

    // Click outside to close
    document.addEventListener("click", e => {
      if (this.isVisible && !this.contextMenu.contains(e.target)) {
        this.hideMenu();
      }
    });

    // Escape key to close
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && this.isVisible) {
        this.hideMenu();
      }
    });

    // Context menu item clicks
    this.contextMenu.addEventListener("click", e => {
      const item = e.target.closest(".context-menu-item");
      if (item) {
        const action = item.getAttribute("data-action");
        this.executeAction(action);
        this.hideMenu();
      }
    });

    // Prevent context menu on the context menu itself
    this.contextMenu.addEventListener("contextmenu", e => {
      e.preventDefault();
    });

    // Window resize - hide menu
    window.addEventListener("resize", () => {
      if (this.isVisible) {
        this.hideMenu();
      }
    });

    // Mobile touch support
    this.setupMobileTouchSupport();
  }

  setupMobileTouchSupport() {
    let touchTimer = null;
    let touchStartPos = null;
    const longPressDelay = 500; // 500ms for long press
    const moveThreshold = 10; // 10px movement threshold

    // Touch start
    document.addEventListener("touchstart", e => {
      const fileElement = e.target.closest(
        "tr[data-file-id], .file-grid-item[data-file-id]"
      );
      if (!fileElement) return;

      touchStartPos = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };

      touchTimer = setTimeout(() => {
        // Long press detected
        this.handleMobileLongPress(e, fileElement);
        touchTimer = null;
      }, longPressDelay);
    });

    // Touch move - cancel long press if moved too much
    document.addEventListener("touchmove", e => {
      if (touchTimer && touchStartPos) {
        const currentPos = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };

        const distance = Math.sqrt(
          Math.pow(currentPos.x - touchStartPos.x, 2) +
            Math.pow(currentPos.y - touchStartPos.y, 2)
        );

        if (distance > moveThreshold) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
      }
    });

    // Touch end - cancel long press
    document.addEventListener("touchend", () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
      touchStartPos = null;
    });

    // Touch cancel - cancel long press
    document.addEventListener("touchcancel", () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
      touchStartPos = null;
    });
  }

  handleMobileLongPress(e, fileElement) {
    // Only prevent default if event is cancelable
    if (e.cancelable) {
      e.preventDefault();
    }

    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const fileId = fileElement.getAttribute("data-file-id");
    const isFolder = fileElement.getAttribute("data-is-folder") === "true";

    // Find file data - check if fileManager exists and has currentFiles
    if (
      typeof fileManager === "undefined" ||
      !fileManager ||
      !fileManager.currentFiles
    ) {
      // Try to get file data from DOM attributes as fallback
      let fileName = "Unknown";

      // Try multiple methods to get file name
      const nameElement = fileElement.querySelector(".file-link, .folder-link");
      const renameButton = fileElement.querySelector(
        ".btn-rename[data-file-name]"
      );

      if (nameElement && nameElement.textContent?.trim()) {
        fileName = nameElement.textContent.trim();
      } else if (renameButton && renameButton.getAttribute("data-file-name")) {
        fileName = renameButton.getAttribute("data-file-name");
      } else {
        // Try alternative selectors
        const altNameElement = fileElement.querySelector(
          "td:first-child span, .file-name, .folder-name"
        );
        if (altNameElement && altNameElement.textContent?.trim()) {
          fileName = altNameElement.textContent.trim();
        }
      }

      this.currentFile = {
        id: fileId,
        name: fileName,
        isFolder: isFolder,
        webViewLink: null, // Add default properties
      };
      // Only log once to avoid spam
      if (!this.fallbackWarningShown) {
        console.warn("FileManager not available, using fallback file data");
        this.fallbackWarningShown = true;
      }
    } else {
      this.currentFile = fileManager.currentFiles.find(f => f.id === fileId);
    }

    this.currentTarget = fileElement;

    if (!this.currentFile) {
      console.warn("File data not found for mobile context menu");
      return;
    }

    // Update menu items based on file type
    this.updateMenuItems(this.currentFile, isFolder);

    // Show menu at touch position
    const touch = e.touches[0] || e.changedTouches[0];
    this.showMenu(touch.clientX, touch.clientY);

    // Show toast to indicate long press was detected
    showToast("Menu ngữ cảnh đã mở", "info");
  }

  handleContextMenu(e) {
    // Find the file/folder element
    const fileElement = e.target.closest(
      "tr[data-file-id], .file-grid-item[data-file-id]"
    );

    if (!fileElement) {
      // Right-click on empty space - hide menu
      this.hideMenu();
      return;
    }

    e.preventDefault();

    const fileId = fileElement.getAttribute("data-file-id");
    const isFolder = fileElement.getAttribute("data-is-folder") === "true";

    // Find file data - check if fileManager exists and has currentFiles
    if (
      typeof fileManager === "undefined" ||
      !fileManager ||
      !fileManager.currentFiles
    ) {
      // Try to get file data from DOM attributes as fallback
      let fileName = "Unknown";

      // Try multiple methods to get file name
      const nameElement = fileElement.querySelector(".file-link, .folder-link");
      const renameButton = fileElement.querySelector(
        ".btn-rename[data-file-name]"
      );

      if (nameElement && nameElement.textContent?.trim()) {
        fileName = nameElement.textContent.trim();
      } else if (renameButton && renameButton.getAttribute("data-file-name")) {
        fileName = renameButton.getAttribute("data-file-name");
      } else {
        // Try alternative selectors
        const altNameElement = fileElement.querySelector(
          "td:first-child span, .file-name, .folder-name"
        );
        if (altNameElement && altNameElement.textContent?.trim()) {
          fileName = altNameElement.textContent.trim();
        }
      }

      this.currentFile = {
        id: fileId,
        name: fileName,
        isFolder: isFolder,
        webViewLink: null,
      };
      // Only log once to avoid spam
      if (!this.fallbackWarningShown) {
        console.warn("FileManager not available, using fallback file data");
        this.fallbackWarningShown = true;
      }
    } else {
      this.currentFile = fileManager.currentFiles.find(f => f.id === fileId);
    }

    this.currentTarget = fileElement;

    if (!this.currentFile) {
      console.warn("File data not found for context menu");
      return;
    }

    // Update menu items based on file type
    this.updateMenuItems(this.currentFile, isFolder);

    // Show menu at cursor position
    this.showMenu(e.clientX, e.clientY);
  }

  updateMenuItems(file, isFolder) {
    const previewItem = this.contextMenu.querySelector(
      '[data-action="preview"]'
    );
    const downloadItem = this.contextMenu.querySelector(
      '[data-action="download"]'
    );
    const copyLinkItem = this.contextMenu.querySelector(
      '[data-action="copy-link"]'
    );

    // Hide preview for folders
    if (previewItem) {
      previewItem.style.display = isFolder ? "none" : "flex";
    }

    // Update download text for folders
    if (downloadItem) {
      const text = downloadItem.querySelector("span:nth-child(2)");
      if (text) {
        text.textContent = isFolder ? "Tải xuống thư mục" : "Tải xuống";
      }
    }

    // Update copy link availability
    if (copyLinkItem) {
      copyLinkItem.style.display = file.webViewLink ? "flex" : "none";
    }
  }

  showMenu(x, y) {
    if (!this.contextMenu) return;

    // Position menu
    this.contextMenu.style.left = x + "px";
    this.contextMenu.style.top = y + "px";
    this.contextMenu.style.display = "block";

    // Check if menu goes off-screen and adjust
    const rect = this.contextMenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position
    if (rect.right > viewportWidth) {
      this.contextMenu.style.left = x - rect.width + "px";
    }

    // Adjust vertical position
    if (rect.bottom > viewportHeight) {
      this.contextMenu.style.top = y - rect.height + "px";
    }

    // Add show class for animation
    setTimeout(() => {
      this.contextMenu.classList.add("show", "animate-in");
    }, 10);

    this.isVisible = true;
  }

  hideMenu() {
    if (!this.contextMenu || !this.isVisible) return;

    this.contextMenu.classList.remove("show", "animate-in");

    setTimeout(() => {
      this.contextMenu.style.display = "none";
    }, 200);

    this.isVisible = false;
    this.currentTarget = null;
    this.currentFile = null;
  }

  executeAction(action) {
    if (!this.currentFile) return;

    const file = this.currentFile;
    const isFolder = file.isFolder;

    switch (action) {
      case "preview":
        if (
          !isFolder &&
          typeof previewManager !== "undefined" &&
          previewManager
        ) {
          const currentFiles =
            typeof fileManager !== "undefined" &&
            fileManager &&
            fileManager.currentFiles
              ? fileManager.currentFiles
              : [];
          previewManager.previewFile(file, currentFiles);
        }
        break;

      case "download":
        if (typeof fileManager !== "undefined" && fileManager) {
          fileManager.downloadFile(file.id, file.name);
        } else {
          // Fallback
          window.open(`/api/download/${file.id}`, "_blank");
        }
        break;

      case "rename":
        if (typeof fileManager !== "undefined" && fileManager) {
          fileManager.renameFile(file.id, file.name);
        } else {
          // Fallback: show simple prompt and make API call directly
          const newName = prompt("Nhập tên mới:", file.name);
          if (newName && newName !== file.name) {
            this.renameFileDirect(file.id, newName);
          }
        }
        break;

      case "copy-link":
        if (file.webViewLink) {
          navigator.clipboard
            .writeText(file.webViewLink)
            .then(() => {
              showToast("Đã sao chép liên kết!", "success");
            })
            .catch(() => {
              showToast("Không thể sao chép liên kết!", "error");
            });
        }
        break;

      case "cut":
        // Cut operation - prepare for move
        if (
          typeof fileOperationsManager !== "undefined" &&
          fileOperationsManager
        ) {
          fileOperationsManager.prepareCutOperation([file]);
        } else {
          showToast("File operations manager not available", "error");
        }
        break;

      case "copy":
        // Copy operation - prepare for copy
        if (
          typeof fileOperationsManager !== "undefined" &&
          fileOperationsManager
        ) {
          fileOperationsManager.prepareCopyOperation([file]);
        } else {
          showToast("File operations manager not available", "error");
        }
        break;

      case "move":
        // Show folder tree for move operation
        if (
          typeof fileOperationsManager !== "undefined" &&
          fileOperationsManager
        ) {
          // Temporarily select this file for move operation
          if (typeof multiSelectManager !== "undefined" && multiSelectManager) {
            multiSelectManager.clearSelection();
            multiSelectManager.selectFile(file.id);
          }
          fileOperationsManager.showFolderTreeDialog("move");
        } else {
          showToast("File operations manager not available", "error");
        }
        break;

      case "copy-to":
        // Show folder tree for copy operation
        if (
          typeof fileOperationsManager !== "undefined" &&
          fileOperationsManager
        ) {
          // Temporarily select this file for copy operation
          if (typeof multiSelectManager !== "undefined" && multiSelectManager) {
            multiSelectManager.clearSelection();
            multiSelectManager.selectFile(file.id);
          }
          fileOperationsManager.showFolderTreeDialog("copy");
        } else {
          showToast("File operations manager not available", "error");
        }
        break;

      case "delete":
        if (typeof fileManager !== "undefined" && fileManager) {
          fileManager.deleteFile(file.id, isFolder);
        } else {
          // Fallback: show confirm and make API call directly
          const itemType = isFolder ? "thư mục" : "file";
          if (confirm(`Bạn chắc chắn muốn xóa ${itemType} "${file.name}"?`)) {
            this.deleteFileDirect(file.id);
          }
        }
        break;

      case "delete-forever":
        // Permanent delete for recycle bin
        if (typeof recycleBinManager !== "undefined" && recycleBinManager) {
          recycleBinManager.permanentlyDeleteFile(file.id);
        } else {
          // Fallback: direct API call
          if (
            confirm(
              `Bạn chắc chắn muốn xóa vĩnh viễn "${file.name}"? Hành động này không thể hoàn tác!`
            )
          ) {
            this.permanentDeleteDirect(file.id);
          }
        }
        break;

      case "restore":
        // Restore from recycle bin
        if (typeof recycleBinManager !== "undefined" && recycleBinManager) {
          recycleBinManager.restoreFile(file.id);
        } else {
          // Fallback: direct API call
          this.restoreFileDirect(file.id);
        }
        break;

      default:
        console.warn("Unknown context menu action:", action);
    }
  }

  // Method to programmatically show context menu
  showForElement(element, file) {
    this.currentFile = file;
    this.currentTarget = element;

    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    this.updateMenuItems(file, file.isFolder);
    this.showMenu(x, y);
  }

  // Method to check if menu is visible
  isMenuVisible() {
    return this.isVisible;
  }

  // Method to get current file
  getCurrentFile() {
    return this.currentFile;
  }

  // Fallback methods when fileManager is not available
  async renameFileDirect(fileId, newName) {
    try {
      const response = await fetch(`/api/rename/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        showToast("Đã đổi tên thành công!", "success");
        // Reload page to refresh file list
        window.location.reload();
      } else {
        showToast("Lỗi đổi tên!", "error");
      }
    } catch (error) {
      showToast("Lỗi đổi tên!", "error");
    }
  }

  async deleteFileDirect(fileId) {
    try {
      const response = await fetch(`/api/delete/${fileId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showToast("Đã xóa thành công!", "success");
        // Reload page to refresh file list
        window.location.reload();
      } else {
        showToast("Lỗi xóa file!", "error");
      }
    } catch (error) {
      showToast("Lỗi xóa file!", "error");
    }
  }

  async permanentDeleteDirect(fileId) {
    try {
      const response = await fetch(`/api/permanent-delete/${fileId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showToast("Đã xóa vĩnh viễn!", "success");
        window.location.reload();
      } else {
        showToast("Lỗi xóa vĩnh viễn!", "error");
      }
    } catch (error) {
      showToast("Lỗi xóa vĩnh viễn!", "error");
    }
  }

  async restoreFileDirect(fileId) {
    try {
      const response = await fetch(`/api/restore/${fileId}`, {
        method: "POST",
      });

      if (response.ok) {
        showToast("Đã khôi phục thành công!", "success");
        window.location.reload();
      } else {
        showToast("Lỗi khôi phục file!", "error");
      }
    } catch (error) {
      showToast("Lỗi khôi phục file!", "error");
    }
  }
}

// Export instance
const contextMenuManager = new ContextMenuManager();

// Global access for debugging
window.contextMenuManager = contextMenuManager;
