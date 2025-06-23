// Main Application Controller
class App {
  constructor() {
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      console.log("🚀 Initializing Mini Google Drive...");

      // Mobile optimizations
      this.setupMobileOptimizations();

      // Initialize breadcrumbs
      fileManager.breadcrumbs = [{ id: null, name: "Tệp của bạn" }];

      // Ensure uploadManager config is loaded
      await this.initializeUploadManager();

      // Load initial data
      await this.loadInitialData();

      // Setup event listeners
      this.setupEventListeners();

      // Mark as initialized
      this.isInitialized = true;

      console.log("✅ Mini Google Drive initialized successfully");
      showToast("Ứng dụng đã sẵn sàng!", "success");
    } catch (error) {
      console.error("❌ Failed to initialize app:", error);
      showToast("Lỗi khởi tạo ứng dụng", "error");
    }
  }

  setupMobileOptimizations() {
    // Detect mobile device
    const isMobile =
      window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if (isMobile) {
      document.body.classList.add("mobile-device");

      // Prevent zoom on double tap
      let lastTouchEnd = 0;
      document.addEventListener(
        "touchend",
        event => {
          const now = new Date().getTime();
          if (now - lastTouchEnd <= 300) {
            event.preventDefault();
          }
          lastTouchEnd = now;
        },
        false
      );

      // Optimize scroll performance
      document.addEventListener("touchstart", () => {}, { passive: true });
      document.addEventListener("touchmove", () => {}, { passive: true });

      // Add mobile-specific classes
      const mainContent = document.querySelector(".main-content");
      if (mainContent) {
        mainContent.classList.add("mobile-optimized");
      }

      // Optimize viewport for mobile
      this.optimizeViewportForMobile();

      console.log("📱 Mobile optimizations applied");
    }
  }

  optimizeViewportForMobile() {
    // Handle orientation change
    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        // Force viewport recalculation
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute(
            "content",
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
          );
        }

        // Trigger resize event
        window.dispatchEvent(new Event("resize"));
      }, 100);
    });

    // Handle safe area insets for iOS
    if (CSS.supports("padding-top: env(safe-area-inset-top)")) {
      document.documentElement.style.setProperty(
        "--safe-area-top",
        "env(safe-area-inset-top)"
      );
      document.documentElement.style.setProperty(
        "--safe-area-bottom",
        "env(safe-area-inset-bottom)"
      );
    }
  }

  async initializeUploadManager() {
    try {
      console.log("📋 Loading upload configuration...");

      // Ensure uploadManager exists and load its config
      if (
        typeof uploadManager !== "undefined" &&
        uploadManager.loadUploadConfig
      ) {
        await uploadManager.loadUploadConfig();
        console.log(
          `✅ Upload config: max ${(
            uploadManager.maxFileSize /
            (1024 * 1024)
          ).toFixed(0)}MB per file, max ${uploadManager.maxFiles} files`
        );
      } else {
        console.warn(
          "⚠️ uploadManager not found or missing loadUploadConfig method"
        );
      }
    } catch (error) {
      console.error("❌ Failed to initialize upload manager:", error);
      // Don't throw here, let app continue with defaults
    }
  }

  async loadInitialData() {
    try {
      // Show initial skeletons
      const breadcrumbContainer = document.getElementById("breadcrumbs");
      const storageContainer = document.getElementById("storageBar");

      if (typeof skeletonManager !== "undefined" && skeletonManager) {
        if (breadcrumbContainer) {
          skeletonManager.showBreadcrumbSkeleton(breadcrumbContainer);
        }
        if (storageContainer) {
          skeletonManager.showStorageSkeleton(storageContainer);
        }
      }

      // Load files in root directory
      await fileManager.openFolder(null, false);

      // Hide navigation skeletons and render real content
      if (typeof skeletonManager !== "undefined" && skeletonManager) {
        skeletonManager.hideSkeleton("breadcrumb");
        skeletonManager.hideSkeleton("storage");
      }

      // Render breadcrumbs
      fileManager.renderBreadcrumbs();

      // Fetch storage information
      await fetchStorage();

      // Load sort preference
      sortManager.loadSortPreference();
    } catch (error) {
      // Hide skeletons on error
      if (typeof skeletonManager !== "undefined" && skeletonManager) {
        skeletonManager.hideAllSkeletons();
      }
      console.error("Error loading initial data:", error);
      throw error;
    }
  }

  setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener("keydown", this.handleKeyboard.bind(this));

    // Window events
    window.addEventListener("beforeunload", this.handleBeforeUnload.bind(this));

    // Handle browser back/forward
    window.addEventListener("popstate", this.handlePopState.bind(this));

    // Handle visibility change (tab switching)
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this)
    );

    // File upload event listeners
    const fileInput = document.getElementById("fileInput");
    const folderInput = document.getElementById("folderInput");
    const createFolderBtn = document.getElementById("createFolderBtn");
    const recycleBinBtn = document.getElementById("recycleBinBtn");

    if (fileInput) {
      fileInput.addEventListener("change", e => {
        uploadManager.uploadFileList(
          e.target.files,
          fileManager.currentFolderId
        );
      });
    }

    if (folderInput) {
      folderInput.addEventListener("change", e => {
        uploadManager.uploadFolder(e.target.files, fileManager.currentFolderId);
      });
    }

    if (createFolderBtn) {
      createFolderBtn.addEventListener("click", () => {
        promptCreateFolder();
      });
    }

    if (recycleBinBtn) {
      recycleBinBtn.addEventListener("click", () => {
        window.location.href = "recycle-bin.html";
      });
    }

    // Event delegation for grid view actions
    document.addEventListener("click", e => {
      // Handle grid action buttons
      if (e.target.closest(".file-grid-action")) {
        const button = e.target.closest(".file-grid-action");
        const fileId = button.getAttribute("data-file-id");
        const fileName = button.getAttribute("data-file-name");
        const isFolder = button.getAttribute("data-is-folder") === "true";

        if (button.classList.contains("btn-preview")) {
          // Preview file
          const file = fileManager.currentFiles?.find(f => f.id === fileId);
          if (file) {
            previewManager.previewFile(file, fileManager.currentFiles || []);
          }
        } else if (button.classList.contains("btn-download")) {
          // Download file
          if (typeof fileManager !== "undefined" && fileManager) {
            fileManager.downloadFile(fileId, fileName);
          } else {
            // Fallback
            window.open(`/api/download/${fileId}`, "_blank");
          }
        } else if (button.classList.contains("btn-rename")) {
          // Rename file
          fileManager.renameFile(fileId, fileName);
        } else if (button.classList.contains("btn-delete")) {
          // Delete file
          fileManager.deleteFile(fileId, isFolder);
        }
      }
    });
  }

  handleKeyboard(e) {
    // Ctrl+F: Focus search
    if (e.ctrlKey && e.key === "f") {
      e.preventDefault();
      const searchInput = document.getElementById("searchInput");
      if (searchInput) {
        searchInput.focus();
      }
    }

    // Escape: Clear search or close modals
    if (e.key === "Escape") {
      // Close any open modals
      const modals = document.querySelectorAll(".modal-bg");
      modals.forEach(modal => modal.remove());

      // Clear search if in search mode
      if (searchManager.isSearchMode) {
        searchManager.clearSearch();
      }
    }

    // Ctrl+Shift+N: Create new folder (avoid browser new tab)
    if (e.ctrlKey && e.shiftKey && e.key === "N") {
      e.preventDefault();
      promptCreateFolder();
    }

    // Alternative: Insert key for create folder
    if (e.key === "Insert") {
      e.preventDefault();
      promptCreateFolder();
    }

    // F5: Refresh current folder
    if (e.key === "F5") {
      e.preventDefault();
      this.refreshCurrentView().catch(error => {
        console.error("Error refreshing on F5:", error);
      });
    }
  }

  handleBeforeUnload(e) {
    // Warn user if there are uploads in progress
    if (uploadManager.isUploading) {
      e.preventDefault();
      e.returnValue = "Bạn có upload đang diễn ra. Bạn có chắc muốn thoát?";
      return e.returnValue;
    }
  }

  handlePopState(e) {
    // Handle browser back/forward navigation
    // This could be implemented to maintain folder navigation history
  }

  handleVisibilityChange() {
    if (!document.hidden && this.isInitialized) {
      // Refresh data when tab becomes visible again
      setTimeout(() => {
        this.refreshCurrentView().catch(error => {
          console.error("Error refreshing view on visibility change:", error);
        });
      }, 1000);
    }
  }

  async refreshCurrentView() {
    try {
      showToast("Đang làm mới...", "info");

      if (searchManager.isSearchMode) {
        // Refresh search results (skeleton handled in searchManager)
        await searchManager.performSearch(searchManager.searchTerm);
      } else {
        // Refresh current folder (skeleton handled in fileManager)
        await fileManager.renderFiles(fileManager.currentFolderId);
      }

      // Refresh storage info
      await fetchStorage();

      showToast("Đã làm mới!", "success");
    } catch (error) {
      console.error("Error refreshing view:", error);
      showToast("Lỗi làm mới dữ liệu", "error");
    }
  }

  // Utility methods
  showLoading(message = "Đang tải...") {
    // Could implement a global loading indicator
    showToast(message, "info");
  }

  hideLoading() {
    // Hide global loading indicator
  }

  // Error handling
  handleError(error, context = "Unknown") {
    console.error(`Error in ${context}:`, error);

    let message = "Đã xảy ra lỗi";

    // Handle different error types safely
    if (error) {
      let errorMessage = "";

      // Extract error message safely
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && error.message) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && error.toString) {
        errorMessage = error.toString();
      }

      // Categorize common error types
      if (errorMessage) {
        if (
          errorMessage.includes("network") ||
          errorMessage.includes("fetch") ||
          errorMessage.includes("NetworkError")
        ) {
          message = "Lỗi kết nối mạng";
        } else if (
          errorMessage.includes("permission") ||
          errorMessage.includes("Forbidden")
        ) {
          message = "Không có quyền truy cập";
        } else if (
          errorMessage.includes("quota") ||
          errorMessage.includes("storage")
        ) {
          message = "Dung lượng Drive đã hết";
        } else if (
          errorMessage.includes("timeout") ||
          errorMessage.includes("TimeoutError")
        ) {
          message = "Kết nối quá thời gian";
        } else if (errorMessage.length > 0 && errorMessage !== "undefined") {
          message = `Lỗi: ${errorMessage}`;
        }
      }
    }

    // Only show toast if message is meaningful
    if (message && message !== "Đã xảy ra lỗi undefined") {
      showToast(message, "error");
    }
  }

  // Performance monitoring
  startPerformanceTimer(label) {
    if (console.time) {
      console.time(label);
    }
  }

  endPerformanceTimer(label) {
    if (console.timeEnd) {
      console.timeEnd(label);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});

// Global error handler
window.addEventListener("error", e => {
  console.error("Global error:", e.error);
  if (window.app) {
    window.app.handleError(e.error, "Global");
  }
});

// Unhandled promise rejection handler
window.addEventListener("unhandledrejection", e => {
  console.error("Unhandled promise rejection:", e.reason);

  // Prevent the default unhandled rejection behavior
  e.preventDefault();

  if (window.app) {
    window.app.handleError(e.reason, "Promise");
  } else {
    // Fallback if app not initialized yet
    console.error("App not initialized, cannot handle error:", e.reason);
  }
});

// Service Worker registration (for future PWA features)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // navigator.serviceWorker.register('/sw.js')
    //   .then(registration => console.log('SW registered'))
    //   .catch(error => console.log('SW registration failed'));
  });
}
