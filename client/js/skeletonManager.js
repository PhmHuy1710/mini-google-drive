// Skeleton Manager Module
class SkeletonManager {
  constructor() {
    this.isActive = false;
    this.currentSkeletons = new Set();
    this.currentTbodyId = null;

    this.init();
  }

  init() {
    console.log("💀 Skeleton Manager initialized");
  }

  // Show file list skeleton (table view)
  showFileListSkeleton(container, count = 8, tbodyId = null) {
    if (!container) return;

    // Find the existing table tbody - try specific ID first, then search in container
    let tbody;
    if (tbodyId) {
      tbody = document.getElementById(tbodyId);
    } else {
      // Auto-detect tbody: first try fileListBody, then trashListBody, then any tbody in container
      tbody =
        document.getElementById("fileListBody") ||
        document.getElementById("trashListBody") ||
        container.querySelector("tbody");
    }

    if (!tbody) return;

    // Clear existing content and add skeleton rows
    tbody.innerHTML = this.generateFileRowSkeletons(count);
    tbody.classList.add("skeleton-mode");

    // Store the tbody ID for later cleanup
    this.currentTbodyId = tbody.id;
    this.currentSkeletons.add("file-table");
    this.isActive = true;
  }

  // Show file grid skeleton (grid view)
  showFileGridSkeleton(container, count = 12) {
    if (!container) return;

    const skeletonGrid = document.createElement("div");
    skeletonGrid.className = "skeleton-grid";
    skeletonGrid.id = "skeleton-file-grid";

    skeletonGrid.innerHTML = this.generateGridItemSkeletons(count);

    container.appendChild(skeletonGrid);
    this.currentSkeletons.add("file-grid");
    this.isActive = true;
  }

  // Show search results skeleton
  showSearchSkeleton(container, count = 6, tbodyId = null) {
    if (!container) return;

    // Find the existing table tbody - auto-detect or use specific ID
    let tbody;
    if (tbodyId) {
      tbody = document.getElementById(tbodyId);
    } else {
      tbody =
        document.getElementById("fileListBody") ||
        document.getElementById("trashListBody") ||
        container.querySelector("tbody");
    }

    if (!tbody) return;

    // Clear existing content and add skeleton rows with search styling
    tbody.innerHTML = this.generateFileRowSkeletons(count);
    tbody.classList.add("skeleton-mode", "search-skeleton");

    // Store the tbody ID for later cleanup
    this.currentTbodyId = tbody.id;
    this.currentSkeletons.add("search");
    this.isActive = true;
  }

  // Show breadcrumb skeleton
  showBreadcrumbSkeleton(container) {
    if (!container) return;

    const skeletonBreadcrumb = document.createElement("div");
    skeletonBreadcrumb.className = "skeleton-breadcrumb";
    skeletonBreadcrumb.id = "skeleton-breadcrumb";

    skeletonBreadcrumb.innerHTML = `
      <div class="skeleton skeleton-breadcrumb-item home"></div>
      <div class="skeleton skeleton-breadcrumb-separator"></div>
      <div class="skeleton skeleton-breadcrumb-item folder"></div>
      <div class="skeleton skeleton-breadcrumb-separator"></div>
      <div class="skeleton skeleton-breadcrumb-item folder"></div>
    `;

    container.appendChild(skeletonBreadcrumb);
    this.currentSkeletons.add("breadcrumb");
    this.isActive = true;
  }

  // Show storage bar skeleton
  showStorageSkeleton(container) {
    if (!container) return;

    const skeletonStorage = document.createElement("div");
    skeletonStorage.className = "skeleton skeleton-storage";
    skeletonStorage.id = "skeleton-storage";

    container.appendChild(skeletonStorage);
    this.currentSkeletons.add("storage");
    this.isActive = true;
  }

  // Generate file row skeletons for table view
  generateFileRowSkeletons(count) {
    const rows = [];
    const nameVariants = ["short", "medium", "long"];

    for (let i = 0; i < count; i++) {
      const nameVariant = nameVariants[i % nameVariants.length];

      rows.push(`
        <tr class="skeleton-table-row">
          <td class="skeleton-table-cell col-name">
            <div class="skeleton skeleton-file-icon"></div>
            <div class="skeleton skeleton-file-name ${nameVariant}"></div>
          </td>
          <td class="skeleton-table-cell col-time">
            <div class="skeleton skeleton-file-date"></div>
          </td>
          <td class="skeleton-table-cell col-size">
            <div class="skeleton skeleton-file-size"></div>
          </td>
          <td class="skeleton-table-cell col-action">
            <div class="skeleton-file-actions">
              <div class="skeleton skeleton-action-btn"></div>
              <div class="skeleton skeleton-action-btn"></div>
              <div class="skeleton skeleton-action-btn"></div>
            </div>
          </td>
        </tr>
      `);
    }

    return rows.join("");
  }

  // Generate grid item skeletons for grid view
  generateGridItemSkeletons(count) {
    const items = [];

    for (let i = 0; i < count; i++) {
      items.push(`
        <div class="skeleton-grid-item">
          <div class="skeleton skeleton-grid-icon"></div>
          <div class="skeleton skeleton-grid-name"></div>
          <div class="skeleton skeleton-grid-meta"></div>
        </div>
      `);
    }

    return items.join("");
  }

  // Hide specific skeleton
  hideSkeleton(type) {
    if (type === "file-table" || type === "search") {
      // Special handling for tbody-based skeletons - use stored tbody ID
      const tbodyId = this.currentTbodyId || "fileListBody";
      const tbody = document.getElementById(tbodyId);
      if (tbody) {
        tbody.innerHTML = "";
        tbody.classList.remove("skeleton-mode", "search-skeleton");
      }
      this.currentSkeletons.delete(type);
    } else {
      // Handle other skeleton types
      const skeletonElement = document.getElementById(`skeleton-${type}`);
      if (skeletonElement) {
        skeletonElement.remove();
        this.currentSkeletons.delete(type);
      }
    }

    if (this.currentSkeletons.size === 0) {
      this.isActive = false;
      this.currentTbodyId = null; // Reset tbody ID
    }
  }

  // Hide all skeletons
  hideAllSkeletons() {
    this.currentSkeletons.forEach(type => {
      if (type === "file-table" || type === "search") {
        // Special handling for tbody-based skeletons - use stored tbody ID
        const tbodyId = this.currentTbodyId || "fileListBody";
        const tbody = document.getElementById(tbodyId);
        if (tbody) {
          tbody.innerHTML = "";
          tbody.classList.remove("skeleton-mode", "search-skeleton");
        }
      } else {
        // Handle other skeleton types
        const skeletonElement = document.getElementById(`skeleton-${type}`);
        if (skeletonElement) {
          skeletonElement.remove();
        }
      }
    });

    this.currentSkeletons.clear();
    this.isActive = false;
    this.currentTbodyId = null; // Reset tbody ID
  }

  // Show skeleton based on current view
  showFileListSkeletonForCurrentView(container, count = 8) {
    if (!container) return;

    // Check current view mode
    const isGridView =
      typeof viewManager !== "undefined" &&
      viewManager &&
      viewManager.isGridView &&
      viewManager.isGridView();

    if (isGridView) {
      this.showFileGridSkeleton(container, count);
    } else {
      this.showFileListSkeleton(container, count);
    }
  }

  // Helper method specifically for trash/recycle bin
  showTrashSkeleton(container, count = 6) {
    return this.showFileListSkeleton(container, count, "trashListBody");
  }

  // Utility methods
  isSkeletonActive() {
    return this.isActive;
  }

  getActiveSkeletons() {
    return Array.from(this.currentSkeletons);
  }

  // Method to show skeleton with delay (for better UX)
  showSkeletonWithDelay(type, container, delay = 200, ...args) {
    setTimeout(() => {
      switch (type) {
        case "file-list":
          this.showFileListSkeletonForCurrentView(container, ...args);
          break;
        case "search":
          this.showSearchSkeleton(container, ...args);
          break;
        case "breadcrumb":
          this.showBreadcrumbSkeleton(container, ...args);
          break;
        case "storage":
          this.showStorageSkeleton(container, ...args);
          break;
      }
    }, delay);
  }

  // Method to hide skeleton with fade out
  hideSkeletonWithFade(type, duration = 300) {
    if (type === "file-table" || type === "search") {
      // Special handling for tbody-based skeletons - use stored tbody ID
      const tbodyId = this.currentTbodyId || "fileListBody";
      const tbody = document.getElementById(tbodyId);
      if (tbody) {
        tbody.style.transition = `opacity ${duration}ms ease`;
        tbody.style.opacity = "0";

        setTimeout(() => {
          this.hideSkeleton(type);
          tbody.style.opacity = "1"; // Reset opacity for normal content
          tbody.style.transition = "";
        }, duration);
      }
    } else {
      // Handle other skeleton types
      const skeletonElement = document.getElementById(`skeleton-${type}`);
      if (skeletonElement) {
        skeletonElement.style.transition = `opacity ${duration}ms ease`;
        skeletonElement.style.opacity = "0";

        setTimeout(() => {
          this.hideSkeleton(type);
        }, duration);
      }
    }
  }
}

// Export instance
const skeletonManager = new SkeletonManager();

// Global access for debugging
window.skeletonManager = skeletonManager;
