// Mobile Action Manager Module
class MobileActionManager {
  constructor() {
    this.mobileActionMenu = null;
    this.mobileBulkActions = null;
    this.currentFile = null;
    this.isMenuVisible = false;
    this.isBulkMode = false;

    this.init();
  }

  init() {
    this.mobileActionMenu = document.getElementById("mobileActionMenu");
    this.mobileBulkActions = document.getElementById("mobileBulkActions");

    if (!this.mobileActionMenu || !this.mobileBulkActions) {
      console.warn("Mobile action elements not found");
      return;
    }

    this.setupEventListeners();
    console.log("📱 Mobile Action Manager initialized");
  }

  setupEventListeners() {
    // Close mobile action menu
    const closeBtn = document.getElementById("mobileActionClose");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.hideMobileActionMenu();
      });
    }

    // Mobile action menu clicks
    this.mobileActionMenu.addEventListener("click", e => {
      const actionBtn = e.target.closest(".mobile-action-btn");
      if (actionBtn) {
        const action = actionBtn.getAttribute("data-action");
        this.executeMobileAction(action);
        this.hideMobileActionMenu();
      }
    });

    // Mobile bulk actions
    const bulkDownload = document.getElementById("mobileBulkDownload");
    const bulkDelete = document.getElementById("mobileBulkDelete");
    const bulkCancel = document.getElementById("mobileBulkCancel");

    if (bulkDownload) {
      bulkDownload.addEventListener("click", () => {
        this.handleBulkDownload();
      });
    }

    if (bulkDelete) {
      bulkDelete.addEventListener("click", () => {
        this.handleBulkDelete();
      });
    }

    if (bulkCancel) {
      bulkCancel.addEventListener("click", () => {
        this.exitBulkMode();
      });
    }

    // Click outside to close
    document.addEventListener("click", e => {
      if (
        this.isMenuVisible &&
        !this.mobileActionMenu.contains(e.target) &&
        !e.target.closest(".mobile-action-trigger")
      ) {
        this.hideMobileActionMenu();
      }
    });

    // Detect mobile device and add action triggers
    if (this.isMobileDevice()) {
      this.addMobileActionTriggers();
    }
  }

  isMobileDevice() {
    return (
      window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    );
  }

  addMobileActionTriggers() {
    // Add action triggers to existing file rows
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.tagName === "TR") {
              this.addActionTriggerToRow(node);
            }
          });
        }
      });
    });

    const fileTableBody = document.getElementById("fileListBody");
    if (fileTableBody) {
      observer.observe(fileTableBody, { childList: true });

      // Add triggers to existing rows
      const existingRows = fileTableBody.querySelectorAll("tr");
      existingRows.forEach(row => this.addActionTriggerToRow(row));
    }
  }

  addActionTriggerToRow(row) {
    if (!this.isMobileDevice() || row.querySelector(".mobile-action-trigger")) {
      return;
    }

    const actionCell = row.querySelector(".col-action .action-group");
    if (actionCell) {
      // Hide original action buttons on mobile
      actionCell.style.display = "none";

      // Add mobile action trigger
      const trigger = document.createElement("button");
      trigger.className = "mobile-action-trigger";
      trigger.innerHTML = '<span class="mdi mdi-dots-vertical"></span>';
      trigger.title = "Tác vụ";

      trigger.addEventListener("click", e => {
        e.stopPropagation();
        const fileId = row.getAttribute("data-file-id");
        const isFolder = row.getAttribute("data-is-folder") === "true";

        if (fileManager && fileManager.currentFiles) {
          const file = fileManager.currentFiles.find(f => f.id === fileId);
          if (file) {
            this.showMobileActionMenu(file, isFolder);
          }
        }
      });

      actionCell.parentNode.appendChild(trigger);
    }
  }

  showMobileActionMenu(file, isFolder) {
    this.currentFile = file;

    // Update menu title
    const title = document.getElementById("mobileActionTitle");
    if (title) {
      title.textContent = file.name;
    }

    // Update action buttons based on file type
    this.updateMobileActionButtons(file, isFolder);

    // Show menu
    this.mobileActionMenu.style.display = "block";
    setTimeout(() => {
      this.mobileActionMenu.classList.add("show");
    }, 10);

    this.isMenuVisible = true;
  }

  hideMobileActionMenu() {
    if (!this.isMenuVisible) return;

    this.mobileActionMenu.classList.remove("show");
    setTimeout(() => {
      this.mobileActionMenu.style.display = "none";
    }, 300);

    this.isMenuVisible = false;
    this.currentFile = null;
  }

  updateMobileActionButtons(file, isFolder) {
    const previewBtn = this.mobileActionMenu.querySelector(
      '[data-action="preview"]'
    );
    const copyLinkBtn = this.mobileActionMenu.querySelector(
      '[data-action="copy-link"]'
    );

    // Hide preview for folders
    if (previewBtn) {
      previewBtn.style.display = isFolder ? "none" : "block";
    }

    // Show/hide copy link based on availability
    if (copyLinkBtn) {
      copyLinkBtn.style.display = file.webViewLink ? "block" : "none";
    }
  }

  executeMobileAction(action) {
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
          previewManager.previewFile(file, fileManager.currentFiles || []);
        }
        break;

      case "download":
        window.open(`/api/download/${file.id}`, "_blank");
        break;

      case "rename":
        if (typeof fileManager !== "undefined" && fileManager) {
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
        if (typeof fileManager !== "undefined" && fileManager) {
          fileManager.deleteFile(file.id, isFolder);
        }
        break;

      default:
        console.warn("Unknown mobile action:", action);
    }
  }

  // Bulk actions
  enterBulkMode() {
    this.isBulkMode = true;
    document.body.classList.add("mobile-select-mode");
    this.showBulkActionsBar();
  }

  exitBulkMode() {
    this.isBulkMode = false;
    document.body.classList.remove("mobile-select-mode");
    this.hideBulkActionsBar();

    // Deselect all files
    if (typeof multiSelectManager !== "undefined" && multiSelectManager) {
      multiSelectManager.deselectAll();
    }
  }

  showBulkActionsBar() {
    this.mobileBulkActions.style.display = "flex";
    setTimeout(() => {
      this.mobileBulkActions.classList.add("show");
    }, 10);
  }

  hideBulkActionsBar() {
    this.mobileBulkActions.classList.remove("show");
    setTimeout(() => {
      this.mobileBulkActions.style.display = "none";
    }, 300);
  }

  updateBulkActionsInfo(count) {
    const info = document.getElementById("mobileBulkInfo");
    if (info) {
      info.textContent = `${count} mục đã chọn`;
    }
  }

  handleBulkDownload() {
    if (typeof multiSelectManager !== "undefined" && multiSelectManager) {
      const selectedFiles = Array.from(multiSelectManager.selectedFiles);
      selectedFiles.forEach(fileId => {
        window.open(`/api/download/${fileId}`, "_blank");
      });
      showToast(`Đang tải ${selectedFiles.length} file`, "info");
    }
  }

  handleBulkDelete() {
    if (typeof multiSelectManager !== "undefined" && multiSelectManager) {
      const selectedCount = multiSelectManager.selectedFiles.size;
      if (confirm(`Bạn có chắc muốn xóa ${selectedCount} mục đã chọn?`)) {
        multiSelectManager.deleteSelected();
        this.exitBulkMode();
      }
    }
  }

  // Public methods
  isInBulkMode() {
    return this.isBulkMode;
  }

  getCurrentFile() {
    return this.currentFile;
  }
}

// Export instance
const mobileActionManager = new MobileActionManager();

// Global access for debugging
window.mobileActionManager = mobileActionManager;
