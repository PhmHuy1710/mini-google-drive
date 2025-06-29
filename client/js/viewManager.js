// View Manager Module
class ViewManager {
  constructor() {
    this.currentView = "list"; // 'list' or 'grid'
    this.viewToggleBtn = null;
    this.viewToggleIcon = null;
    this.fileTable = null;
    this.fileGrid = null;
    this.storageKey = "mini-drive-view";

    this.init();
  }

  init() {
    this.viewToggleBtn = document.getElementById("viewToggleBtn");
    this.viewToggleIcon = document.getElementById("viewToggleIcon");
    this.fileTable = document.getElementById("fileTable");
    this.fileGrid = document.getElementById("fileGrid");

    if (
      !this.viewToggleBtn ||
      !this.viewToggleIcon ||
      !this.fileTable ||
      !this.fileGrid
    ) {
      console.warn("View manager elements not found");
      return;
    }

    // Load saved view preference
    this.loadViewPreference();

    // Setup event listeners
    this.setupEventListeners();

    console.log("📋 View Manager initialized");
  }

  setupEventListeners() {
    if (this.viewToggleBtn) {
      this.viewToggleBtn.addEventListener("click", () => {
        this.toggleView();
      });
    }
  }

  loadViewPreference() {
    const savedView = localStorage.getItem(this.storageKey);
    if (savedView && (savedView === "list" || savedView === "grid")) {
      this.setView(savedView, false);
    } else {
      // Default to list view
      this.setView("list", false);
    }
  }

  toggleView() {
    const newView = this.currentView === "list" ? "grid" : "list";
    this.setView(newView, true);

    // Add switching animation
    if (this.viewToggleBtn) {
      this.viewToggleBtn.classList.add("switching");
      setTimeout(() => {
        this.viewToggleBtn.classList.remove("switching");
      }, 300);
    }

    // Show toast notification
    const viewText = newView === "grid" ? "lưới" : "danh sách";
    showToast(`Đã chuyển sang chế độ xem ${viewText}`, "info");
  }

  setView(view, saveToStorage = true) {
    if (view !== "list" && view !== "grid") {
      console.warn("Invalid view:", view);
      return;
    }

    this.currentView = view;

    // Update UI
    this.updateViewDisplay();
    this.updateToggleIcon();
    this.updatePaginationVisibility();

    // Re-render files in new view (safe check to avoid circular calls)
    if (
      typeof fileManager !== "undefined" &&
      fileManager &&
      fileManager.currentFiles
    ) {
      if (view === "grid") {
        this.renderFiles(fileManager.currentFiles);
      } else {
        // Re-render list view - use setTimeout to avoid circular calls
        setTimeout(() => {
          if (typeof fileManager !== "undefined" && fileManager) {
            fileManager.renderFiles(fileManager.currentFolderId);
          }
        }, 0);
      }
    }

    // Save to localStorage if requested
    if (saveToStorage) {
      localStorage.setItem(this.storageKey, view);
    }

    // Dispatch custom event for other components
    window.dispatchEvent(
      new CustomEvent("viewChanged", {
        detail: { view: view },
      })
    );

    console.log(`📋 View set to: ${view}`);
  }

  updateViewDisplay() {
    if (this.currentView === "grid") {
      // Show grid, hide table
      this.fileTable.style.display = "none";
      this.fileGrid.style.display = "grid";
    } else {
      // Show table, hide grid
      this.fileTable.style.display = "table";
      this.fileGrid.style.display = "none";
    }
  }

  updateToggleIcon() {
    if (!this.viewToggleIcon) return;

    if (this.currentView === "grid") {
      // Show list icon when in grid mode (to switch to list)
      this.viewToggleIcon.className = "mdi mdi-view-list";
      this.viewToggleBtn.title = "Chuyển sang chế độ danh sách";
    } else {
      // Show grid icon when in list mode (to switch to grid)
      this.viewToggleIcon.className = "mdi mdi-view-grid";
      this.viewToggleBtn.title = "Chuyển sang chế độ lưới";
    }
  }

  updatePaginationVisibility() {
    // Hide pagination in grid view, show in list view
    const paginationContainer = document.querySelector(".pagination-container");
    if (paginationContainer) {
      if (this.currentView === "grid") {
        paginationContainer.style.display = "none";
        console.log("📄 Pagination hidden for grid view");
      } else {
        // Only show pagination in list view if paginationManager exists and is needed
        if (typeof paginationManager !== "undefined" && paginationManager) {
          if (paginationManager.isVisible && paginationManager.totalPages > 1) {
            paginationContainer.style.display = "flex";
            console.log("📄 Pagination shown for list view");
          } else {
            paginationContainer.style.display = "none";
          }
        } else {
          paginationContainer.style.display = "none";
        }
      }
    }
  }

  getCurrentView() {
    return this.currentView;
  }

  isGridView() {
    return this.currentView === "grid";
  }

  isListView() {
    return this.currentView === "list";
  }

  // Method to render files in current view
  renderFiles(files) {
    if (this.currentView === "grid") {
      // Check if virtual scrolling should handle this (500+ files)
      if (
        typeof virtualScrollManager !== "undefined" &&
        virtualScrollManager &&
        files.length >= 500
      ) {
        // Let virtual scrolling handle the rendering
        return false;
      }

      this.renderGridView(files);
    } else {
      // List view is handled by fileManager
      return false; // Let fileManager handle list view
    }
    return true; // We handled the rendering
  }

  renderGridView(files) {
    if (!this.fileGrid) return;

    this.fileGrid.innerHTML = "";

    if (!files || files.length === 0) {
      return;
    }

    files.forEach(file => {
      const gridItem = this.createGridItem(file);
      this.fileGrid.appendChild(gridItem);
    });

    // Trigger lazy loading for thumbnails
    this.initializeLazyLoading();
  }

  createGridItem(file) {
    const item = document.createElement("div");
    item.className = "file-grid-item";
    item.setAttribute("data-file-id", file.id);
    item.setAttribute("data-is-folder", file.isFolder);

    // Get file icon (remove HTML wrapper, just get icon class and color)
    const iconHtml = getFileTypeIcon(file);
    const iconMatch = iconHtml.match(/class="([^"]*)".*?style="([^"]*)"/);
    const iconClass = iconMatch ? iconMatch[1] : "mdi mdi-file";
    const iconStyle = iconMatch ? iconMatch[2] : "color:#666";

    // Format file size and date
    const fileSize = file.size ? formatSize(file.size) : "";
    const fileDate = file.modifiedTime
      ? new Date(file.modifiedTime).toLocaleDateString("vi-VN")
      : "";

    item.innerHTML = `
      <div class="file-grid-icon">
        ${this.createFileIcon(file, iconClass, iconStyle)}
      </div>
      
      <div class="file-grid-name" title="${file.name}">${file.name}</div>
      
      <div class="file-grid-meta">
        ${fileSize ? `${fileSize} • ` : ""}${fileDate}
      </div>
    `;

    // Add click handler for opening files/folders
    item.addEventListener("click", e => {
      // Handle item click (open folder/preview file)
      if (file.isFolder) {
        if (typeof fileManager !== "undefined" && fileManager) {
          fileManager.openFolder(file.id);
        }
      } else {
        if (
          typeof previewManager !== "undefined" &&
          previewManager &&
          typeof fileManager !== "undefined" &&
          fileManager
        ) {
          previewManager.previewFile(file, fileManager.currentFiles || []);
        }
      }
    });

    return item;
  }

  createFileIcon(file, iconClass, iconStyle) {
    const isImageFile = this.isImageFile(file.name);

    if (isImageFile && !file.isFolder) {
      // Create lazy-loaded image thumbnail for image files
      return `
        <div class="file-thumbnail-container">
          <img 
            data-src="/api/download/${file.id}"
            data-file-id="${file.id}"
            class="file-thumbnail lazy-loading"
            alt="${file.name}"
          />
        </div>`;
    } else {
      // Regular icon for non-image files
      return `<span class="${iconClass}" style="${iconStyle}"></span>`;
    }
  }

  isImageFile(fileName) {
    if (!fileName) return false;

    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".bmp",
      ".webp",
      ".svg",
      ".ico",
      ".tiff",
      ".tif",
    ];

    const extension = fileName
      .toLowerCase()
      .substring(fileName.lastIndexOf("."));
    return imageExtensions.includes(extension);
  }

  initializeLazyLoading() {
    // Initialize lazy loading for thumbnails if LazyLoadManager is available
    if (
      typeof window.lazyLoadManager !== "undefined" &&
      window.lazyLoadManager &&
      typeof window.lazyLoadManager.setupLazyLoad === "function"
    ) {
      try {
        const thumbnails = document.querySelectorAll(
          ".file-thumbnail.lazy-loading"
        );

        thumbnails.forEach(thumbnail => {
          const thumbnailUrl = thumbnail.getAttribute("data-src");
          const fallbackIcon = "mdi-image";

          if (thumbnailUrl) {
            window.lazyLoadManager.setupLazyLoad(
              thumbnail,
              thumbnailUrl,
              fallbackIcon
            );
          }
        });

        console.log(
          `🖼️ Lazy loading initialized for ${thumbnails.length} thumbnails`
        );
      } catch (error) {
        console.warn("⚠️ Error initializing lazy loading:", error);
        this.loadAllThumbnailsImmediately();
      }
    } else {
      // Fallback: load all images immediately
      console.warn(
        "⚠️ LazyLoadManager not available, loading images immediately"
      );
      this.loadAllThumbnailsImmediately();
    }
  }

  loadAllThumbnailsImmediately() {
    const thumbnails = document.querySelectorAll(
      ".file-thumbnail.lazy-loading"
    );
    thumbnails.forEach(thumbnail => {
      const src = thumbnail.getAttribute("data-src");
      if (src) {
        thumbnail.src = src;
        thumbnail.classList.remove("lazy-loading");
        thumbnail.classList.add("loaded");
      }
    });
  }

  // Method to force refresh current view
  refreshCurrentView() {
    if (
      typeof fileManager !== "undefined" &&
      fileManager &&
      fileManager.currentFiles
    ) {
      this.renderFiles(fileManager.currentFiles);
    }
  }
}

// Export instance
const viewManager = new ViewManager();

// Global access for debugging
window.viewManager = viewManager;
