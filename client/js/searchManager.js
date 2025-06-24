// Search Manager Module
class SearchManager {
  constructor() {
    this.isSearchMode = false;
    this.searchTerm = "";
    this.lastSearchResults = [];
    this.setupSearchBox();
  }

  setupSearchBox() {
    // Add search box and filters to toolbar
    const toolbar = document.querySelector(".toolbar-secondary");
    const searchContainer = document.createElement("div");
    searchContainer.className = "search-container";
    searchContainer.innerHTML = `
      <div class="search-box">
        <span class="mdi mdi-magnify search-icon"></span>
        <input type="text" id="searchInput" placeholder="Tìm kiếm file, thư mục..." />
        <button id="searchClear" class="search-clear mdi mdi-close" style="display: none;"></button>
      </div>
      <div class="filter-container">
        <select id="fileTypeFilter" class="file-type-filter">
          <option value="all">🗂️ Tất cả</option>
          <option value="folder">📁 Thư mục</option>
          <option value="image">🖼️ Hình ảnh</option>
          <option value="document">📄 Tài liệu</option>
          <option value="video">🎥 Video</option>
          <option value="audio">🎵 Âm thanh</option>
          <option value="archive">📦 File nén</option>
          <option value="code">💻 Mã nguồn</option>
        </select>
      </div>
    `;

    // Insert at the beginning of toolbar-secondary
    if (toolbar) {
      toolbar.insertBefore(searchContainer, toolbar.firstChild);
    }

    this.setupSearchEvents();
    this.setupFilterEvents();
  }

  setupSearchEvents() {
    const searchInput = document.getElementById("searchInput");
    const searchClear = document.getElementById("searchClear");

    // Debounced search
    let searchTimeout;
    searchInput.addEventListener("input", e => {
      clearTimeout(searchTimeout);
      const term = e.target.value.trim();

      if (term) {
        searchClear.style.display = "block";
        searchTimeout = setTimeout(() => this.performSearch(term), 300);
      } else {
        searchClear.style.display = "none";
        this.clearSearch();
      }
    });

    // Clear search
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      searchClear.style.display = "none";
      this.clearSearch();
    });

    // Enter key
    searchInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        const term = e.target.value.trim();
        if (term) this.performSearch(term);
      }
    });
  }

  setupFilterEvents() {
    const fileTypeFilter = document.getElementById("fileTypeFilter");

    fileTypeFilter.addEventListener("change", e => {
      const selectedType = e.target.value;
      this.applyFileTypeFilter(selectedType);
    });
  }

  applyFileTypeFilter(type) {
    // Update filter indicator
    this.updateFilterIndicator(type);

    if (this.isSearchMode) {
      // Apply filter to search results
      const filteredResults = this.filterByType(this.lastSearchResults, type);
      this.renderSearchResults(filteredResults, this.searchTerm);
    } else {
      // Apply filter to current folder files
      const currentFiles = fileManager.currentFiles || [];
      const filteredFiles = this.filterByType(currentFiles, type);
      this.renderFilteredFiles(filteredFiles, type);
    }
  }

  updateFilterIndicator(type) {
    const filterSelect = document.getElementById("fileTypeFilter");
    const filterContainer = document.querySelector(".filter-container");

    if (!filterSelect || !filterContainer) return;

    // Remove existing indicator
    const existingIndicator =
      filterContainer.querySelector(".filter-indicator");
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Add new indicator if filter is active
    if (type && type !== "all") {
      const indicator = document.createElement("div");
      indicator.className = "filter-indicator";
      indicator.innerHTML = `
        <span class="filter-badge">
          <span class="mdi mdi-filter"></span>
          ${this.getFilterDisplayName(type)}
        </span>
      `;
      filterContainer.appendChild(indicator);
    }
  }

  renderFilteredFiles(files, filterType) {
    const tbody = document.getElementById("fileListBody");
    const emptyNote = document.getElementById("emptyNote");
    const breadcrumbs = document.getElementById("breadcrumbs");

    // Update breadcrumbs to show filter mode
    if (filterType !== "all") {
      const filterName = this.getFilterDisplayName(filterType);
      breadcrumbs.innerHTML = `
        <span class="mdi mdi-filter"></span>
        <span class="breadcrumb-current">Lọc: ${filterName}</span>
        <button class="btn-back-filter" id="backFromFilterBtn">
          <span class="mdi mdi-arrow-left"></span> Quay lại
        </button>
      `;

      // Add event listener for back button
      const backBtn = document.getElementById("backFromFilterBtn");
      if (backBtn) {
        backBtn.addEventListener("click", () => this.clearFilter());
      }
    } else {
      fileManager.renderBreadcrumbs();
    }

    tbody.innerHTML = "";

    if (!files.length) {
      emptyNote.style.display = "block";
      emptyNote.innerHTML =
        filterType === "all"
          ? "Chưa có tệp hay thư mục nào"
          : `Không có ${this.getFilterDisplayName(
              filterType
            ).toLowerCase()} nào`;
      return;
    }

    emptyNote.style.display = "none";

    // Sort files using sortManager
    const sortedFiles = sortManager.sortFiles(files);

    tbody.innerHTML = sortedFiles
      .map(file => fileManager.renderFileRow(file))
      .join("");

    // Notify multi-select manager about file list update
    multiSelectManager.onFileListRendered();
  }

  getFilterDisplayName(type) {
    const names = {
      all: "Tất cả",
      folder: "Thư mục",
      image: "Hình ảnh",
      document: "Tài liệu",
      video: "Video",
      audio: "Âm thanh",
      archive: "File nén",
      code: "Mã nguồn",
    };
    return names[type] || "Tất cả";
  }

  clearFilter() {
    const fileTypeFilter = document.getElementById("fileTypeFilter");
    if (fileTypeFilter) {
      fileTypeFilter.value = "all";
    }

    // Clear filter indicator
    this.updateFilterIndicator("all");

    // Return to normal folder view
    fileManager.renderFiles(fileManager.currentFolderId);
    fileManager.renderBreadcrumbs();
  }

  async performSearch(term) {
    if (!term) return;

    this.isSearchMode = true;
    this.searchTerm = term;

    try {
      // Show skeleton loading for search results
      const tableWrapper = document.querySelector(".table-wrapper");
      if (
        typeof skeletonManager !== "undefined" &&
        skeletonManager &&
        tableWrapper
      ) {
        // Clear existing content and show search skeleton
        const tbody = document.getElementById("fileListBody");
        if (tbody) tbody.innerHTML = "";
        skeletonManager.showSearchSkeleton(tableWrapper, 6);
      }

      showToast("Đang tìm kiếm...", "info");
      const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      const results = await response.json();

      // Hide skeleton loading
      if (typeof skeletonManager !== "undefined" && skeletonManager) {
        skeletonManager.hideAllSkeletons();
      }

      this.renderSearchResults(results, term);
      showToast(`Tìm thấy ${results.length} kết quả`, "success");
    } catch (error) {
      // Hide skeleton loading on error
      if (typeof skeletonManager !== "undefined" && skeletonManager) {
        skeletonManager.hideAllSkeletons();
      }
      showToast("Lỗi tìm kiếm", "error");
      console.error("Search error:", error);
    }
  }

  renderSearchResults(results, term) {
    this.lastSearchResults = results; // Store results for preview navigation

    const tbody = document.getElementById("fileListBody");
    const emptyNote = document.getElementById("emptyNote");
    const breadcrumbs = document.getElementById("breadcrumbs");

    // Update breadcrumbs to show search mode
    breadcrumbs.innerHTML = `
      <span class="mdi mdi-magnify"></span>
      <span class="breadcrumb-current">Kết quả tìm kiếm: "${term}"</span>
      <button class="btn-back-search" id="backFromSearchBtn">
        <span class="mdi mdi-arrow-left"></span> Quay lại
      </button>
    `;

    // Add event listener for back button
    const backBtn = document.getElementById("backFromSearchBtn");
    if (backBtn) {
      backBtn.addEventListener("click", () => this.clearSearch());
    }

    tbody.innerHTML = "";

    if (!results.length) {
      emptyNote.style.display = "block";
      emptyNote.innerHTML = `Không tìm thấy file hoặc thư mục nào với từ khóa "<strong>${term}</strong>"`;
      return;
    }

    emptyNote.style.display = "none";

    // Sort results using sortManager
    const sortedResults = sortManager.sortFiles(results);

    tbody.innerHTML = sortedResults
      .map(file => this.renderSearchResultRow(file, term))
      .join("");

    // Notify multi-select manager about file list update
    multiSelectManager.onFileListRendered();
  }

  renderSearchResultRow(file, searchTerm) {
    // Highlight search term in file name
    const highlightedName = this.highlightSearchTerm(file.name, searchTerm);

    return `
      <tr data-file-id="${file.id}" data-is-folder="${
      file.isFolder
    }" class="search-result-row">
        <td class="col-name">
          ${getFileTypeIcon(file)}
          ${
            file.isFolder
              ? `<span class="folder-link search-folder-link" data-folder-id="${file.id}">${highlightedName}</span>`
              : file.shareLink
              ? `<a class="file-link" href="${file.shareLink}" target="_blank" rel="noopener">${highlightedName}</a>`
              : `<span class="file-link">${highlightedName}</span>`
          }
          <div class="file-path">${file.path || ""}</div>
        </td>
        <td class="col-time">${
          file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : ""
        }</td>
        <td class="col-size">${file.size ? formatSize(file.size) : ""}</td>
        <td>
          <div class="action-group">
          ${
            !file.isFolder
              ? `
            <button class="btn-action btn-preview mdi mdi-eye" title="Xem trước" data-file-id="${file.id}"></button>
            <a class="btn-action btn-download mdi mdi-download" title="Tải về" href="/api/download/${file.id}" download></a>
          `
              : ""
          }
            <button class="btn-action btn-locate mdi mdi-map-marker" title="Định vị" data-file-id="${
              file.id
            }" data-parent-id="${file.parentId || ""}"></button>
            <button class="btn-action btn-delete mdi mdi-delete" title="Xóa" data-file-id="${
              file.id
            }" data-is-folder="${file.isFolder}"></button>
          </div>
        </td>
      </tr>
    `;
  }

  highlightSearchTerm(text, term) {
    if (!term) return text;
    const regex = new RegExp(
      `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    return text.replace(regex, "<mark>$1</mark>");
  }

  async openFolderFromSearch(folderId) {
    this.clearSearch();
    await fileManager.openFolder(folderId);
  }

  async locateFile(fileId, parentId) {
    this.clearSearch();
    if (parentId) {
      await fileManager.openFolder(parentId);
      // Highlight the located file
      setTimeout(() => {
        const row = document.querySelector(`tr[data-file-id="${fileId}"]`);
        if (row) {
          row.classList.add("highlighted");
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => row.classList.remove("highlighted"), 3000);
        }
      }, 500);
    }
  }

  clearSearch() {
    this.isSearchMode = false;
    this.searchTerm = "";

    const searchInput = document.getElementById("searchInput");
    const searchClear = document.getElementById("searchClear");
    const emptyNote = document.getElementById("emptyNote");

    if (searchInput) searchInput.value = "";
    if (searchClear) searchClear.style.display = "none";

    // Reset empty note text
    emptyNote.innerHTML = "Chưa có tệp hay thư mục nào";

    // Return to current folder view
    fileManager.renderFiles(fileManager.currentFolderId);
    fileManager.renderBreadcrumbs();
  }

  async previewFromSearch(fileId) {
    try {
      // Get current search results for navigation
      const files = this.lastSearchResults || [];
      const currentFile = files.find(f => f.id === fileId);

      if (!currentFile) {
        showToast("Không tìm thấy file!", "error");
        return;
      }

      if (currentFile.isFolder) {
        showToast("Không thể xem trước thư mục!", "error");
        return;
      }

      // Filter only files (not folders) for navigation
      const fileList = files.filter(f => !f.isFolder);

      // Open preview with error handling
      if (previewManager && previewManager.previewFile) {
        try {
          await previewManager.previewFile(currentFile, fileList);
        } catch (previewError) {
          console.error("Error in preview manager from search:", previewError);
          showToast("Lỗi hiển thị preview!", "error");
        }
      } else {
        showToast("Preview manager không khả dụng!", "error");
      }
    } catch (error) {
      console.error("Preview from search error:", error);
      showToast("Lỗi mở xem trước!", "error");
    }
  }

  // Advanced search filters
  filterByType(files, type) {
    if (!type || type === "all") return files;

    switch (type) {
      case "folder":
        return files.filter(f => f.isFolder);
      case "image":
        return files.filter(
          f =>
            !f.isFolder &&
            /\.(jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff|tif)$/i.test(f.name)
        );
      case "document":
        return files.filter(
          f =>
            !f.isFolder &&
            /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt|ods|odp)$/i.test(
              f.name
            )
        );
      case "video":
        return files.filter(
          f =>
            !f.isFolder &&
            /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v|3gp|ogv)$/i.test(f.name)
        );
      case "audio":
        return files.filter(
          f =>
            !f.isFolder &&
            /\.(mp3|wav|flac|aac|ogg|wma|m4a|opus)$/i.test(f.name)
        );
      case "archive":
        return files.filter(
          f =>
            !f.isFolder &&
            /\.(zip|rar|7z|tar|gz|bz2|xz|tar\.gz|tar\.bz2)$/i.test(f.name)
        );
      case "code":
        return files.filter(
          f =>
            !f.isFolder &&
            /\.(js|ts|jsx|tsx|html|css|scss|sass|less|php|py|java|cpp|c|h|cs|rb|go|rs|kt|swift|dart|vue|svelte)$/i.test(
              f.name
            )
        );
      default:
        return files;
    }
  }
}

// Export instance
const searchManager = new SearchManager();
