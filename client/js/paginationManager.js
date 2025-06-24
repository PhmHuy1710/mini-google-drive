// Pagination Manager Module
class PaginationManager {
  constructor() {
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalFiles = 0;
    this.pageSize = 50; // Default page size
    this.folderPageStates = new Map(); // Store page state per folder
    this.isEnabled = false;
    this.isVisible = false; // Track if pagination is currently visible
    this.storageKey = "mini-drive-pagination";

    this.init();
  }

  init() {
    this.loadSettings();
    this.createPaginationUI();
    this.setupViewChangeListener();
    console.log("📄 Pagination Manager initialized");
  }

  setupViewChangeListener() {
    // Listen for view changes to update pagination visibility
    window.addEventListener("viewChanged", event => {
      this.handleViewChange(event.detail.view);
    });
  }

  handleViewChange(view) {
    // In grid view, always hide pagination
    // In list view, show/hide based on pagination state
    const container = document.getElementById("paginationContainer");
    if (!container) return;

    if (view === "grid") {
      container.style.display = "none";
      console.log("📄 Pagination hidden for grid view");
    } else if (view === "list") {
      // Only show if pagination is enabled and has multiple pages
      if (this.isEnabled && this.totalPages > 1) {
        container.style.display = "flex";
        console.log("📄 Pagination shown for list view");
      } else {
        container.style.display = "none";
      }
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const settings = JSON.parse(saved);
        this.pageSize = settings.pageSize || 50;
      }
    } catch (error) {
      console.warn("Failed to load pagination settings:", error);
    }
  }

  saveSettings() {
    try {
      const settings = {
        pageSize: this.pageSize,
        version: "1.0",
      };
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
    } catch (error) {
      console.warn("Failed to save pagination settings:", error);
    }
  }

  createPaginationUI() {
    // Find the table wrapper to insert pagination after it
    const tableWrapper = document.querySelector(".table-wrapper");
    if (!tableWrapper) return;

    // Create pagination container
    const paginationContainer = document.createElement("div");
    paginationContainer.className = "pagination-container";
    paginationContainer.id = "paginationContainer";
    paginationContainer.style.display = "none"; // Hidden by default

    paginationContainer.innerHTML = `
      <div class="pagination-info">
        <div class="pagination-summary" id="paginationSummary">
          Showing 1-50 of 100 files
        </div>
        <div class="pagination-size-selector">
          <label for="pageSizeSelect">Files per page:</label>
          <select id="pageSizeSelect" class="pagination-select">
            <option value="25">25</option>
            <option value="50" selected>50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
      
      <div class="pagination-controls">
        <button class="pagination-btn pagination-first" id="paginationFirst" title="First page">
          <span class="mdi mdi-chevron-double-left"></span>
        </button>
        <button class="pagination-btn pagination-prev" id="paginationPrev" title="Previous page">
          <span class="mdi mdi-chevron-left"></span>
        </button>
        
        <div class="pagination-pages" id="paginationPages">
          <!-- Page numbers will be generated here -->
        </div>
        
        <button class="pagination-btn pagination-next" id="paginationNext" title="Next page">
          <span class="mdi mdi-chevron-right"></span>
        </button>
        <button class="pagination-btn pagination-last" id="paginationLast" title="Last page">
          <span class="mdi mdi-chevron-double-right"></span>
        </button>
      </div>
    `;

    // Insert after table wrapper
    tableWrapper.parentNode.insertBefore(
      paginationContainer,
      tableWrapper.nextSibling
    );

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Page size selector
    const pageSizeSelect = document.getElementById("pageSizeSelect");
    if (pageSizeSelect) {
      pageSizeSelect.value = this.pageSize;
      pageSizeSelect.addEventListener("change", e => {
        this.changePageSize(parseInt(e.target.value));
      });
    }

    // Navigation buttons
    const firstBtn = document.getElementById("paginationFirst");
    const prevBtn = document.getElementById("paginationPrev");
    const nextBtn = document.getElementById("paginationNext");
    const lastBtn = document.getElementById("paginationLast");

    if (firstBtn) firstBtn.addEventListener("click", () => this.goToPage(1));
    if (prevBtn)
      prevBtn.addEventListener("click", () =>
        this.goToPage(this.currentPage - 1)
      );
    if (nextBtn)
      nextBtn.addEventListener("click", () =>
        this.goToPage(this.currentPage + 1)
      );
    if (lastBtn)
      lastBtn.addEventListener("click", () => this.goToPage(this.totalPages));

    // Keyboard shortcuts
    document.addEventListener("keydown", e => {
      if (!this.isEnabled || this.isTypingInInput(e.target)) return;

      // Page Up/Down for pagination
      if (e.key === "PageUp" && e.ctrlKey) {
        e.preventDefault();
        this.goToPage(this.currentPage - 1);
      } else if (e.key === "PageDown" && e.ctrlKey) {
        e.preventDefault();
        this.goToPage(this.currentPage + 1);
      }
    });
  }

  isTypingInInput(element) {
    const inputTypes = ["INPUT", "TEXTAREA", "SELECT"];
    return (
      inputTypes.includes(element.tagName) ||
      element.contentEditable === "true" ||
      element.closest(".search-box")
    );
  }

  updatePagination(paginationData) {
    if (!paginationData) {
      this.hidePagination();
      return;
    }

    this.currentPage = paginationData.currentPage;
    this.totalPages = paginationData.totalPages;
    this.totalFiles = paginationData.totalFiles;

    // Show pagination if there are multiple pages or >= 25 files (lower threshold for better UX)
    if (this.totalPages > 1 || this.totalFiles >= 25) {
      this.showPagination();
      this.updatePaginationInfo();
      this.updatePaginationControls();
    } else {
      this.hidePagination();
    }
  }

  updatePaginationInfo() {
    const summaryElement = document.getElementById("paginationSummary");
    if (!summaryElement) return;

    const startIndex = (this.currentPage - 1) * this.pageSize + 1;
    const endIndex = Math.min(
      this.currentPage * this.pageSize,
      this.totalFiles
    );

    summaryElement.textContent = `Showing ${startIndex}-${endIndex} of ${this.totalFiles} files`;
  }

  updatePaginationControls() {
    // Update button states
    const firstBtn = document.getElementById("paginationFirst");
    const prevBtn = document.getElementById("paginationPrev");
    const nextBtn = document.getElementById("paginationNext");
    const lastBtn = document.getElementById("paginationLast");

    const isFirstPage = this.currentPage === 1;
    const isLastPage = this.currentPage === this.totalPages;

    if (firstBtn) firstBtn.disabled = isFirstPage;
    if (prevBtn) prevBtn.disabled = isFirstPage;
    if (nextBtn) nextBtn.disabled = isLastPage;
    if (lastBtn) lastBtn.disabled = isLastPage;

    // Update page numbers
    this.updatePageNumbers();
  }

  updatePageNumbers() {
    const pagesContainer = document.getElementById("paginationPages");
    if (!pagesContainer) return;

    pagesContainer.innerHTML = "";

    // Calculate page range to show
    const maxVisible = 7; // Maximum visible page numbers
    let startPage = 1;
    let endPage = this.totalPages;

    if (this.totalPages > maxVisible) {
      const halfVisible = Math.floor(maxVisible / 2);

      if (this.currentPage <= halfVisible) {
        // Near the beginning
        endPage = maxVisible;
      } else if (this.currentPage >= this.totalPages - halfVisible) {
        // Near the end
        startPage = this.totalPages - maxVisible + 1;
      } else {
        // In the middle
        startPage = this.currentPage - halfVisible;
        endPage = this.currentPage + halfVisible;
      }
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `pagination-btn pagination-page ${
        i === this.currentPage ? "active" : ""
      }`;
      pageBtn.textContent = i;
      pageBtn.addEventListener("click", () => this.goToPage(i));
      pagesContainer.appendChild(pageBtn);
    }

    // Add ellipsis if needed
    if (startPage > 1) {
      const ellipsis = document.createElement("span");
      ellipsis.className = "pagination-ellipsis";
      ellipsis.textContent = "...";
      pagesContainer.insertBefore(ellipsis, pagesContainer.firstChild);
    }

    if (endPage < this.totalPages) {
      const ellipsis = document.createElement("span");
      ellipsis.className = "pagination-ellipsis";
      ellipsis.textContent = "...";
      pagesContainer.appendChild(ellipsis);
    }
  }

  showPagination() {
    const container = document.getElementById("paginationContainer");
    if (container) {
      container.style.display = "flex";
      this.isEnabled = true;
      this.isVisible = true;
    }
  }

  hidePagination() {
    const container = document.getElementById("paginationContainer");
    if (container) {
      container.style.display = "none";
      this.isEnabled = false;
      this.isVisible = false;
    }
  }

  goToPage(page) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    // Store page state for current folder
    this.storeFolderPageState();

    // Trigger file list reload with new page
    if (typeof fileManager !== "undefined" && fileManager) {
      fileManager.loadFilesWithPagination(page, this.pageSize);
    }

    showToast(`Chuyển đến trang ${page}`, "info");
  }

  changePageSize(newSize) {
    if (newSize === this.pageSize) return;

    this.pageSize = newSize;
    this.saveSettings();

    // Reset to page 1 when changing page size
    this.currentPage = 1;

    // Store page state
    this.storeFolderPageState();

    // Reload with new page size
    if (typeof fileManager !== "undefined" && fileManager) {
      fileManager.loadFilesWithPagination(1, this.pageSize);
    }

    showToast(`Đã thay đổi kích thước trang: ${newSize} files`, "success");
  }

  storeFolderPageState() {
    if (typeof fileManager !== "undefined" && fileManager) {
      const folderId = fileManager.currentFolderId || "root";
      this.folderPageStates.set(folderId, {
        page: this.currentPage,
        pageSize: this.pageSize,
      });
    }
  }

  restoreFolderPageState(folderId = null) {
    const id =
      folderId ||
      (typeof fileManager !== "undefined" && fileManager
        ? fileManager.currentFolderId
        : null) ||
      "root";
    const state = this.folderPageStates.get(id);

    if (state) {
      this.currentPage = state.page;
      this.pageSize = state.pageSize;

      // Update page size selector
      const pageSizeSelect = document.getElementById("pageSizeSelect");
      if (pageSizeSelect) {
        pageSizeSelect.value = this.pageSize;
      }
    } else {
      // Reset to defaults for new folder
      this.currentPage = 1;
    }
  }

  // Public API methods
  getCurrentPage() {
    return this.currentPage;
  }

  getPageSize() {
    return this.pageSize;
  }

  getTotalPages() {
    return this.totalPages;
  }

  getTotalFiles() {
    return this.totalFiles;
  }

  isActive() {
    return this.isEnabled;
  }

  reset() {
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalFiles = 0;
    this.hidePagination();
  }
}

// Export instance
const paginationManager = new PaginationManager();

// Global access for debugging
window.paginationManager = paginationManager;
