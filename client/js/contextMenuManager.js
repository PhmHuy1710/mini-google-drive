// Context Menu Manager Module
class ContextMenuManager {
  constructor() {
    this.contextMenu = null;
    this.currentTarget = null;
    this.currentFile = null;
    this.isVisible = false;

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
    // Prevent default touch behavior
    e.preventDefault();

    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const fileId = fileElement.getAttribute("data-file-id");
    const isFolder = fileElement.getAttribute("data-is-folder") === "true";

    // Find file data
    this.currentFile = fileManager.currentFiles?.find(f => f.id === fileId);
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

    // Find file data
    this.currentFile = fileManager.currentFiles?.find(f => f.id === fileId);
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
        if (!isFolder && previewManager) {
          previewManager.previewFile(file, fileManager.currentFiles || []);
        }
        break;

      case "download":
        window.open(`/api/download/${file.id}`, "_blank");
        break;

      case "rename":
        if (fileManager) {
          fileManager.renameFile(file.id, file.name);
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

      case "delete":
        if (fileManager) {
          fileManager.deleteFile(file.id, isFolder);
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
}

// Export instance
const contextMenuManager = new ContextMenuManager();

// Global access for debugging
window.contextMenuManager = contextMenuManager;
