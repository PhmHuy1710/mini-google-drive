// Virtual Scroll Manager for Mini Google Drive v2.4.0
// Optimizes rendering of large file lists (1000+ items)
class VirtualScrollManager {
  constructor() {
    this.isEnabled = false;
    this.container = null;
    this.viewport = null;
    this.scrollableHeight = 0;
    this.itemHeight = 60; // Default row height for list view
    this.itemsPerRow = 1; // For grid view
    this.items = [];
    this.visibleItems = [];
    this.startIndex = 0;
    this.endIndex = 0;
    this.bufferSize = 5; // Render extra items for smooth scrolling
    this.threshold = 500; // Enable virtual scrolling when > 500 items
    this.scrollTop = 0;
    this.viewportHeight = 0;
    this.totalHeight = 0;
    this.isScrolling = false;
    this.scrollTimeout = null;
    this.currentView = "list"; // 'list' or 'grid'
    this.observer = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupResizeObserver();
    console.log("📜 Virtual Scroll Manager initialized");
  }

  setupEventListeners() {
    // Listen for scroll events (throttled)
    document.addEventListener("scroll", this.handleScroll.bind(this), {
      passive: true,
    });

    // Listen for window resize
    window.addEventListener("resize", this.handleResize.bind(this));

    // Listen for view changes
    document.addEventListener("viewChanged", e => {
      this.currentView = e.detail.view;
      this.recalculateItemDimensions();
      this.render();
    });
  }

  setupResizeObserver() {
    if ("ResizeObserver" in window) {
      this.observer = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.target === this.container) {
            this.handleResize();
          }
        }
      });
    }
  }

  // Initialize virtual scrolling for a container
  initialize(container, items, view = "list") {
    if (!container || !Array.isArray(items)) {
      console.warn("Virtual scroll: Invalid container or items");
      return false;
    }

    // Only enable for large lists
    if (items.length < this.threshold) {
      this.disable();
      return false;
    }

    this.container = container;
    this.items = items;
    this.currentView = view;
    this.isEnabled = true;

    // Setup virtual scroll structure
    this.setupVirtualScrollStructure();
    this.recalculateItemDimensions();
    this.calculateVisibleRange();
    this.render();

    // Start observing container resize
    if (this.observer) {
      this.observer.observe(this.container);
    }

    console.log(`🚀 Virtual scrolling enabled for ${items.length} items`);
    return true;
  }

  setupVirtualScrollStructure() {
    // Clear existing content
    this.container.innerHTML = "";
    this.container.classList.add("virtual-scroll-container");

    // Create viewport
    this.viewport = document.createElement("div");
    this.viewport.className = "virtual-scroll-viewport";
    this.viewport.style.cssText = `
      height: auto;
      overflow: hidden;
      position: relative;
    `;

    // Create scrollable area
    const scrollable = document.createElement("div");
    scrollable.className = "virtual-scroll-scrollable";
    this.updateScrollableHeight();
    scrollable.style.cssText = `
      height: ${this.totalHeight}px;
      position: relative;
    `;

    // Create content container for visible items
    this.contentContainer = document.createElement("div");
    this.contentContainer.className = "virtual-scroll-content";
    this.contentContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      will-change: transform;
    `;

    scrollable.appendChild(this.contentContainer);
    this.viewport.appendChild(scrollable);
    this.container.appendChild(this.viewport);
  }

  recalculateItemDimensions() {
    if (this.currentView === "grid") {
      // Calculate grid dimensions
      this.calculateGridDimensions();
    } else {
      // List view dimensions
      this.itemHeight = 60; // Standard row height
      this.itemsPerRow = 1;
    }

    this.updateScrollableHeight();
    this.calculateVisibleRange();
  }

  calculateGridDimensions() {
    if (!this.container) return;

    const containerWidth = this.container.clientWidth;
    const itemMinWidth = 160; // Minimum grid item width
    const gap = 16; // Gap between items

    // Calculate items per row
    this.itemsPerRow = Math.floor(
      (containerWidth + gap) / (itemMinWidth + gap)
    );
    this.itemsPerRow = Math.max(1, this.itemsPerRow);

    // Calculate item height (grid items are taller)
    this.itemHeight = 180; // Grid item height including padding
  }

  updateScrollableHeight() {
    const totalRows = Math.ceil(this.items.length / this.itemsPerRow);
    this.totalHeight = totalRows * this.itemHeight;

    if (this.viewport) {
      const scrollable = this.viewport.querySelector(
        ".virtual-scroll-scrollable"
      );
      if (scrollable) {
        scrollable.style.height = `${this.totalHeight}px`;
      }
    }
  }

  handleScroll() {
    if (!this.isEnabled) return;

    // Throttle scroll events
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.isScrolling = true;

    // Get scroll position (check both window and container scroll)
    this.scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Find container offset if needed
    const containerRect = this.container.getBoundingClientRect();
    const containerTop = containerRect.top + this.scrollTop;

    // Adjust scroll position relative to container
    const relativeScrollTop = Math.max(0, this.scrollTop - containerTop);

    this.calculateVisibleRange(relativeScrollTop);
    this.render();

    // Debounce scroll end
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
    }, 150);
  }

  handleResize() {
    if (!this.isEnabled) return;

    this.recalculateItemDimensions();
    this.calculateVisibleRange();
    this.render();
  }

  calculateVisibleRange(scrollTop = this.scrollTop) {
    if (!this.container) return;

    this.viewportHeight = window.innerHeight;

    // Calculate which items should be visible
    const startRow = Math.floor(scrollTop / this.itemHeight);
    const endRow = Math.ceil(
      (scrollTop + this.viewportHeight) / this.itemHeight
    );

    // Add buffer for smooth scrolling
    const bufferedStartRow = Math.max(0, startRow - this.bufferSize);
    const bufferedEndRow = Math.min(
      Math.ceil(this.items.length / this.itemsPerRow),
      endRow + this.bufferSize
    );

    // Convert rows to item indices
    this.startIndex = bufferedStartRow * this.itemsPerRow;
    this.endIndex = Math.min(
      this.items.length,
      bufferedEndRow * this.itemsPerRow
    );

    // Get visible items
    this.visibleItems = this.items.slice(this.startIndex, this.endIndex);
  }

  render() {
    if (!this.isEnabled || !this.contentContainer) return;

    // Calculate offset for positioning
    const startRow = Math.floor(this.startIndex / this.itemsPerRow);
    const offsetY = startRow * this.itemHeight;

    // Position content container
    this.contentContainer.style.transform = `translateY(${offsetY}px)`;

    // Render items based on current view
    if (this.currentView === "grid") {
      this.renderGridItems();
    } else {
      this.renderListItems();
    }

    // Update loading indicators
    this.updateLoadingIndicators();
  }

  renderListItems() {
    // Create table structure for list view
    this.contentContainer.innerHTML = `
      <table class="file-list virtual-scroll-table">
        <tbody class="virtual-scroll-tbody">
          ${this.visibleItems.map(item => this.renderListItem(item)).join("")}
        </tbody>
      </table>
    `;

    // Apply lazy loading if available
    this.applyLazyLoading();
  }

  renderGridItems() {
    // Create grid structure
    this.contentContainer.innerHTML = `
      <div class="file-grid virtual-scroll-grid">
        ${this.visibleItems.map(item => this.renderGridItem(item)).join("")}
      </div>
    `;

    // Apply lazy loading if available
    this.applyLazyLoading();
  }

  renderListItem(file) {
    // Use the same rendering logic as fileManager
    return `
      <tr data-file-id="${file.id}" data-is-folder="${
      file.isFolder
    }" data-file-type="${file.isFolder ? "folder" : "file"}">
        <td class="col-name">
          ${this.getFileIcon(file)}
          ${
            file.isFolder
              ? `<span class="folder-link" data-folder-id="${file.id}">${file.name}</span>`
              : file.shareLink
              ? `<a class="file-link" href="${file.shareLink}" target="_blank" rel="noopener">${file.name}</a>`
              : `<span class="file-link">${file.name}</span>`
          }
          <button class="btn-rename mdi mdi-pencil" title="Đổi tên" data-file-id="${
            file.id
          }" data-file-name="${file.name}"></button>
        </td>
        <td class="col-time">${
          file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : ""
        }</td>
        <td class="col-size">${file.size ? formatSize(file.size) : ""}</td>
        <td class="col-action">
          <div class="action-group">
            ${
              file.isFolder
                ? `<button class="btn-action btn-download-zip mdi mdi-folder-zip" title="Tải về dưới dạng ZIP" data-file-id="${file.id}" data-file-name="${file.name}"></button>`
                : `
                <button class="btn-action btn-preview mdi mdi-eye" title="Xem trước" data-file-id="${file.id}"></button>
                <button class="btn-action btn-download mdi mdi-download" title="Tải về" data-file-id="${file.id}" data-file-name="${file.name}"></button>
              `
            }
            <button class="btn-action btn-delete mdi mdi-delete" title="Xóa" data-file-id="${
              file.id
            }" data-is-folder="${file.isFolder}"></button>
          </div>
        </td>
      </tr>
    `;
  }

  renderGridItem(file) {
    // Use viewManager's grid rendering logic if available
    if (typeof viewManager !== "undefined" && viewManager.createGridItem) {
      return viewManager.createGridItem(file);
    }

    // Fallback grid item rendering
    const iconClass = this.getFileIconClass(file);
    return `
      <div class="file-grid-item" data-file-id="${file.id}" data-is-folder="${
      file.isFolder
    }" data-file-type="${file.isFolder ? "folder" : "file"}">
        <div class="file-grid-icon">
          <span class="mdi ${iconClass}"></span>
        </div>
        <div class="file-grid-name" title="${file.name}">${file.name}</div>
        <div class="file-grid-meta">${
          file.size ? formatSize(file.size) : ""
        }</div>
      </div>
    `;
  }

  getFileIcon(file) {
    // Use existing getFileTypeIcon function if available
    if (typeof getFileTypeIcon === "function") {
      return getFileTypeIcon(file);
    }

    // Fallback icon logic
    const iconClass = this.getFileIconClass(file);
    return `<span class="file-icon mdi ${iconClass}"></span>`;
  }

  getFileIconClass(file) {
    if (file.isFolder) return "mdi-folder";

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const iconMap = {
      // Images
      jpg: "mdi-file-image",
      jpeg: "mdi-file-image",
      png: "mdi-file-image",
      gif: "mdi-file-image",
      // Documents
      pdf: "mdi-file-pdf-box",
      doc: "mdi-file-word-box",
      docx: "mdi-file-word-box",
      xls: "mdi-file-excel-box",
      xlsx: "mdi-file-excel-box",
      ppt: "mdi-file-powerpoint-box",
      pptx: "mdi-file-powerpoint-box",
      // Media
      mp4: "mdi-file-video",
      avi: "mdi-file-video",
      mov: "mdi-file-video",
      mp3: "mdi-file-music",
      wav: "mdi-file-music",
      flac: "mdi-file-music",
      // Archives
      zip: "mdi-folder-zip",
      rar: "mdi-folder-zip",
      "7z": "mdi-folder-zip",
      // Code
      js: "mdi-language-javascript",
      html: "mdi-language-html5",
      css: "mdi-language-css3",
      py: "mdi-language-python",
      php: "mdi-language-php",
      java: "mdi-language-java",
    };

    return iconMap[ext] || "mdi-file";
  }

  applyLazyLoading() {
    // Apply lazy loading if available
    if (typeof lazyLoadManager !== "undefined" && lazyLoadManager) {
      setTimeout(() => {
        lazyLoadManager.setupBatchLazyLoad(this.contentContainer);
      }, 0);
    }
  }

  updateLoadingIndicators() {
    // Show loading indicators for items being loaded
    if (this.isScrolling && this.visibleItems.length > 50) {
      // Add subtle loading indicator for large lists
      if (!this.container.querySelector(".virtual-scroll-loading")) {
        const loadingIndicator = document.createElement("div");
        loadingIndicator.className = "virtual-scroll-loading";
        loadingIndicator.innerHTML =
          '<span class="mdi mdi-loading mdi-spin"></span>';
        loadingIndicator.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--bg-secondary);
          padding: 8px 12px;
          border-radius: 20px;
          box-shadow: 0 2px 8px var(--shadow-medium);
          font-size: 14px;
          z-index: 1000;
          opacity: 0.8;
        `;
        this.container.appendChild(loadingIndicator);

        // Remove after scrolling stops
        setTimeout(() => {
          const indicator = this.container.querySelector(
            ".virtual-scroll-loading"
          );
          if (indicator) {
            indicator.remove();
          }
        }, 500);
      }
    }
  }

  // Update items (when file list changes)
  updateItems(newItems) {
    if (!this.isEnabled) return false;

    this.items = newItems;

    // Check if we should disable virtual scrolling
    if (newItems.length < this.threshold) {
      this.disable();
      return false;
    }

    this.updateScrollableHeight();
    this.calculateVisibleRange();
    this.render();
    return true;
  }

  // Disable virtual scrolling
  disable() {
    if (!this.isEnabled) return;

    this.isEnabled = false;

    if (this.observer && this.container) {
      this.observer.unobserve(this.container);
    }

    if (this.container) {
      this.container.classList.remove("virtual-scroll-container");
    }

    console.log("📜 Virtual scrolling disabled");
  }

  // Scroll to specific item
  scrollToItem(index) {
    if (!this.isEnabled || index < 0 || index >= this.items.length) return;

    const row = Math.floor(index / this.itemsPerRow);
    const targetScrollTop = row * this.itemHeight;

    window.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    });
  }

  // Search and scroll to item
  scrollToFile(fileId) {
    const index = this.items.findIndex(item => item.id === fileId);
    if (index !== -1) {
      this.scrollToItem(index);
      return true;
    }
    return false;
  }

  // Get performance stats
  getStats() {
    return {
      isEnabled: this.isEnabled,
      totalItems: this.items.length,
      visibleItems: this.visibleItems.length,
      startIndex: this.startIndex,
      endIndex: this.endIndex,
      itemHeight: this.itemHeight,
      totalHeight: this.totalHeight,
      threshold: this.threshold,
    };
  }

  // Cleanup
  destroy() {
    this.disable();

    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Remove event listeners
    document.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("resize", this.handleResize);

    // Clear references
    this.container = null;
    this.viewport = null;
    this.contentContainer = null;
    this.items = [];
    this.visibleItems = [];
  }
}

// Create global instance
const virtualScrollManager = new VirtualScrollManager();

// Export for global access
window.virtualScrollManager = virtualScrollManager;

console.log("🚀 Virtual Scroll Manager v2.4.0 loaded");
