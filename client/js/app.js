// Main Application Controller
class App {
  constructor() {
    this.isInitialized = false;
    this.lastRefreshTime = 0;
    this.refreshThrottleTime = 300000; // 5 minutes minimum between auto-refreshes
    this.init();
  }

  async init() {
    try {
      console.log("🚀 Initializing Mini Google Drive v2.4.2...");

      // Mobile optimizations
      this.setupMobileOptimizations();

      // Initialize breadcrumbs
      fileManager.breadcrumbs = [{ id: null, name: "Tệp của bạn" }];

      // Ensure uploadManager config is loaded
      await this.initializeUploadManager();

      // Initialize Lazy Loading Manager for performance optimization
      if (typeof LazyLoadManager !== "undefined") {
        window.lazyLoadManager = new LazyLoadManager();
        console.log("✅ Lazy Loading Manager initialized");
      } else {
        console.warn("⚠️ LazyLoadManager not available");
      }

      // Initialize Virtual Scroll Manager for large lists optimization
      if (typeof VirtualScrollManager !== "undefined") {
        window.virtualScrollManager = new VirtualScrollManager();
        console.log("✅ Virtual Scroll Manager initialized");
      } else {
        console.warn("⚠️ VirtualScrollManager not available");
      }

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
      // Throttle auto-refresh to prevent API rate limiting
      const now = Date.now();
      const timeSinceLastRefresh = now - this.lastRefreshTime;

      if (timeSinceLastRefresh >= this.refreshThrottleTime) {
        console.log("🔄 Auto-refresh triggered (tab became visible)");

        // Refresh data when tab becomes visible again
        setTimeout(() => {
          this.refreshCurrentView().catch(error => {
            console.error("Error refreshing view on visibility change:", error);
          });
        }, 1000);

        this.lastRefreshTime = now;
      } else {
        const remainingTime = Math.ceil(
          (this.refreshThrottleTime - timeSinceLastRefresh) / 1000
        );
        console.log(
          `⏳ Auto-refresh throttled. Next refresh available in ${remainingTime} seconds`
        );

        // Show subtle notification about throttling
        //showToast(`Tự động làm mới sau ${remainingTime}s`, "info", 2000);
      }
    }
  }

  async refreshCurrentView() {
    try {
      showToast("Đang làm mới...", "info");

      if (searchManager.isSearchMode) {
        // Refresh search results (skeleton handled in searchManager)
        await searchManager.performSearch(searchManager.searchTerm);
      } else {
        // Refresh current folder with pagination support
        if (
          typeof paginationManager !== "undefined" &&
          paginationManager &&
          paginationManager.isActive()
        ) {
          const page = paginationManager.getCurrentPage();
          const limit = paginationManager.getPageSize();
          await fileManager.loadFilesWithPagination(page, limit);
        } else {
          await fileManager.openFolder(fileManager.currentFolderId, false);
        }
      }

      // Refresh storage info
      await fetchStorage();

      // Update last refresh time for throttling
      this.lastRefreshTime = Date.now();

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

// PWA Install prompt
let deferredPrompt;

window.addEventListener("beforeinstallprompt", e => {
  // Prevent default mini-infobar
  e.preventDefault();
  deferredPrompt = e;

  // Show custom install button
  showPWAInstallButton();
});

function showPWAInstallButton() {
  // Create install button if not exists
  if (!document.getElementById("pwa-install-btn")) {
    const installBtn = document.createElement("button");
    installBtn.id = "pwa-install-btn";
    installBtn.innerHTML = '<i class="mdi mdi-download"></i> Cài đặt App';
    installBtn.className = "btn btn-primary";
    installBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      font-size: 14px;
      padding: 8px 16px;
      border-radius: 6px;
      background: #4a9eff;
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    installBtn.onclick = installPWA;

    document.body.appendChild(installBtn);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (installBtn && installBtn.parentNode) {
        installBtn.remove();
      }
    }, 10000);
  }
}

async function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("✅ PWA installed successfully");
      showToast("App đã được cài đặt!", "success");
    }

    deferredPrompt = null;
    document.getElementById("pwa-install-btn")?.remove();
  }
}

// Service Worker registration with full PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("✅ Service Worker registered successfully:", registration);

      // Check for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showToast(
              "Phiên bản mới đã sẵn sàng. Tải lại trang để cập nhật.",
              "info",
              5000
            );
          }
        });
      });

      // Listen for messages from Service Worker
      navigator.serviceWorker.addEventListener("message", event => {
        const { type, data } = event.data;

        switch (type) {
          case "PROCESS_UPLOAD_QUEUE":
            // Handle queued uploads when back online
            if (
              typeof uploadManager !== "undefined" &&
              uploadManager.processQueuedUploads
            ) {
              uploadManager.processQueuedUploads(data);
            }
            break;

          case "NETWORK_STATUS":
            // Handle network status changes
            if (data.online) {
              showToast("Kết nối mạng đã được khôi phục", "success");
            } else {
              showToast("Mất kết nối mạng - chế độ offline", "warning");
            }
            break;
        }
      });
    } catch (error) {
      console.warn("🔧 Service Worker registration failed:", error);
    }
  });
}
