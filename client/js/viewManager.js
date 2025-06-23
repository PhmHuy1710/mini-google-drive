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
      <div class="file-grid-actions">
        ${
          !file.isFolder
            ? `
        <button class="file-grid-action btn-preview" title="Xem trước"
                data-file-id="${file.id}">
          <span class="mdi mdi-eye"></span>
        </button>
        <button class="file-grid-action btn-download" title="Tải xuống"
                data-file-id="${file.id}" data-file-name="${file.name}">
          <span class="mdi mdi-download"></span>
        </button>
        `
            : `
        <button class="file-grid-action btn-download-zip" title="Tải về dưới dạng ZIP"
                data-file-id="${file.id}" data-file-name="${file.name}">
          <span class="mdi mdi-folder-zip"></span>
        </button>
        `
        }
        <button class="file-grid-action btn-rename" title="Đổi tên"
                data-file-id="${file.id}" data-file-name="${file.name}">
          <span class="mdi mdi-pencil"></span>
        </button>
        <button class="file-grid-action btn-delete" title="Xóa"
                data-file-id="${file.id}" data-is-folder="${file.isFolder}">
          <span class="mdi mdi-delete"></span>
        </button>
      </div>
      
      <div class="file-grid-icon">
        <span class="${iconClass}" style="${iconStyle}"></span>
      </div>
      
      <div class="file-grid-name" title="${file.name}">${file.name}</div>
      
      <div class="file-grid-meta">
        ${fileSize ? `${fileSize} • ` : ""}${fileDate}
      </div>
    `;

    // Add click handler for opening files/folders
    item.addEventListener("click", e => {
      // Handle action button clicks
      if (e.target.closest(".file-grid-action")) {
        const action = e.target.closest(".file-grid-action");

        if (action.classList.contains("btn-download-zip")) {
          // Handle ZIP download for folders
          if (typeof fileManager !== "undefined" && fileManager) {
            fileManager.downloadFolderAsZip(file.id, file.name);
          }
        } else if (action.classList.contains("btn-download")) {
          // Handle regular file download
          if (
            !file.isFolder &&
            typeof fileManager !== "undefined" &&
            fileManager
          ) {
            fileManager.downloadFile(file.id, file.name);
          }
        }
        return; // Don't trigger item click
      }

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
