// File Manager Module
class FileManager {
  constructor() {
    this.currentFolderId = null;
    this.breadcrumbs = [];
    this.folderNameMap = {};
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Use event delegation for dynamically created elements
    document.addEventListener("click", e => {
      // Handle folder link clicks
      if (e.target.classList.contains("folder-link")) {
        const folderId = e.target.getAttribute("data-folder-id");
        if (folderId) {
          // Check if it's a search folder link
          if (e.target.classList.contains("search-folder-link")) {
            searchManager.openFolderFromSearch(folderId);
          } else {
            this.openFolder(folderId);
          }
        }
      }

      // Handle rename button clicks
      if (e.target.classList.contains("btn-rename")) {
        const fileId = e.target.getAttribute("data-file-id");
        const fileName = e.target.getAttribute("data-file-name");
        if (fileId && fileName) {
          this.renameFile(fileId, fileName);
        }
      }

      // Handle delete button clicks
      if (e.target.classList.contains("btn-delete")) {
        const fileId = e.target.getAttribute("data-file-id");
        const isFolder = e.target.getAttribute("data-is-folder") === "true";
        if (fileId) {
          this.deleteFile(fileId, isFolder);
        }
      }

      // Handle locate button clicks (from search results)
      if (e.target.classList.contains("btn-locate")) {
        const fileId = e.target.getAttribute("data-file-id");
        const parentId = e.target.getAttribute("data-parent-id");
        if (fileId) {
          searchManager.locateFile(fileId, parentId);
        }
      }

      // Handle breadcrumb navigation
      if (e.target.classList.contains("breadcrumb-link")) {
        const index = parseInt(e.target.getAttribute("data-breadcrumb-index"));
        if (!isNaN(index)) {
          this.openFolderByBreadcrumb(index);
        }
      }

      // Handle preview button clicks
      if (e.target.classList.contains("btn-preview")) {
        const fileId = e.target.getAttribute("data-file-id");
        if (fileId) {
          // Check if we're in search mode
          if (searchManager.isSearchMode) {
            searchManager.previewFromSearch(fileId);
          } else {
            this.previewFile(fileId);
          }
        }
      }

      // Handle folder ZIP download button clicks
      if (e.target.classList.contains("btn-download-zip")) {
        const folderId = e.target.getAttribute("data-file-id");
        const folderName = e.target.getAttribute("data-file-name");
        if (folderId) {
          this.downloadFolderAsZip(folderId, folderName);
        }
      }

      // Handle file download button clicks
      if (e.target.classList.contains("btn-download")) {
        const fileId = e.target.getAttribute("data-file-id");
        const fileName = e.target.getAttribute("data-file-name");
        if (fileId) {
          this.downloadFile(fileId, fileName);
        }
      }
    });
  }

  async fetchFiles(folderId) {
    try {
      const url = folderId
        ? `/api/files?parentId=${encodeURIComponent(folderId)}`
        : "/api/files";

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const files = await res.json();
      return Array.isArray(files) ? files : [];
    } catch (error) {
      console.error("Error fetching files:", error);
      // Return empty array instead of throwing to prevent unhandled rejections
      return [];
    }
  }

  async renderFiles(folderId) {
    try {
      // Get containers for skeleton loading
      const tableWrapper = document.querySelector(".table-wrapper");
      const fileGrid = document.getElementById("fileGrid");
      const tbody = document.getElementById("fileListBody");
      const emptyNote = document.getElementById("emptyNote");

      if (!tbody || !emptyNote) {
        console.error("Required DOM elements not found");
        return;
      }

      // Hide empty note and clear existing content
      emptyNote.style.display = "none";
      tbody.innerHTML = "";

      // Show skeleton loading based on current view
      if (typeof skeletonManager !== "undefined" && skeletonManager) {
        // Check if we're in grid view
        const isGridView =
          typeof viewManager !== "undefined" &&
          viewManager &&
          viewManager.isGridView &&
          viewManager.isGridView();

        if (isGridView && fileGrid) {
          // Clear grid and show grid skeleton
          fileGrid.innerHTML = "";
          skeletonManager.showFileGridSkeleton(fileGrid, 12);
        } else if (tableWrapper) {
          // Show table skeleton in table wrapper
          skeletonManager.showFileListSkeleton(tableWrapper, 8);
        }
      }

      const files = await this.fetchFiles(folderId);
      this.currentFiles = files; // Store for viewManager

      // Hide skeleton loading
      if (typeof skeletonManager !== "undefined" && skeletonManager) {
        skeletonManager.hideAllSkeletons();
      }

      // Sort files using sortManager
      const sortedFiles = sortManager ? sortManager.sortFiles(files) : files;

      if (!sortedFiles || !sortedFiles.length) {
        emptyNote.style.display = "block";
        tbody.innerHTML = "";

        // Clear grid view too (safe check)
        if (typeof viewManager !== "undefined" && viewManager) {
          viewManager.renderFiles([]);
        }

        // Hide pagination for empty folder
        if (typeof paginationManager !== "undefined" && paginationManager) {
          paginationManager.hidePagination();
        }

        // Disable virtual scrolling for empty folder
        if (
          typeof virtualScrollManager !== "undefined" &&
          virtualScrollManager
        ) {
          virtualScrollManager.disable();
        }
        return;
      }

      emptyNote.style.display = "none";

      // Try virtual scrolling for large lists first (500+ items)
      if (
        typeof virtualScrollManager !== "undefined" &&
        virtualScrollManager &&
        sortedFiles.length >= 500
      ) {
        const currentView =
          typeof viewManager !== "undefined" &&
          viewManager &&
          viewManager.isGridView()
            ? "grid"
            : "list";

        const container = currentView === "grid" ? fileGrid : tableWrapper;

        if (
          virtualScrollManager.initialize(container, sortedFiles, currentView)
        ) {
          // Virtual scrolling handled the rendering
          console.log(
            `🚀 Virtual scrolling active for ${sortedFiles.length} files`
          );

          // Show virtual scroll info
          this.showVirtualScrollInfo(sortedFiles.length);

          // Hide pagination when virtual scrolling is active
          if (typeof paginationManager !== "undefined" && paginationManager) {
            paginationManager.hidePagination();
          }

          // Notify multi-select manager about file list update
          if (multiSelectManager) {
            multiSelectManager.onFileListRendered();
          }

          // Setup drag and drop for file operations
          this.setupFileDragAndDrop();
          return;
        }
      } else if (
        typeof virtualScrollManager !== "undefined" &&
        virtualScrollManager
      ) {
        // Disable virtual scrolling for smaller lists
        virtualScrollManager.disable();
        // Remove any existing virtual scroll info
        this.hideVirtualScrollInfo();
      }

      // Check if viewManager should handle rendering (safe check)
      if (
        typeof viewManager !== "undefined" &&
        viewManager &&
        viewManager.renderFiles(sortedFiles)
      ) {
        // ViewManager handled the rendering (grid view)
        tbody.innerHTML = ""; // Clear table
      } else {
        // Render list view (table)
        tbody.innerHTML = sortedFiles
          .map(file => this.renderFileRow(file))
          .join("");
      }

      // Notify multi-select manager about file list update
      if (multiSelectManager) {
        multiSelectManager.onFileListRendered();
      }

      // Setup drag and drop for file operations
      this.setupFileDragAndDrop();
    } catch (error) {
      console.error("Error rendering files:", error);
      const emptyNote = document.getElementById("emptyNote");
      if (emptyNote) {
        emptyNote.style.display = "block";
        emptyNote.innerHTML = "Lỗi tải danh sách file";
      }
      throw error; // Re-throw for upper level handling
    }
  }

  // New method for paginated file loading
  async loadFilesWithPagination(page = 1, limit = 50) {
    try {
      // Get containers for skeleton loading
      const tableWrapper = document.querySelector(".table-wrapper");
      const fileGrid = document.getElementById("fileGrid");
      const tbody = document.getElementById("fileListBody");
      const emptyNote = document.getElementById("emptyNote");

      if (!tbody || !emptyNote) {
        console.error("Required DOM elements not found");
        return;
      }

      // Hide empty note and clear existing content
      emptyNote.style.display = "none";
      tbody.innerHTML = "";

      // Show skeleton loading based on current view
      if (typeof skeletonManager !== "undefined" && skeletonManager) {
        const isGridView =
          typeof viewManager !== "undefined" &&
          viewManager &&
          viewManager.isGridView &&
          viewManager.isGridView();

        if (isGridView && fileGrid) {
          fileGrid.innerHTML = "";
          skeletonManager.showFileGridSkeleton(fileGrid, limit);
        } else if (tableWrapper) {
          skeletonManager.showFileListSkeleton(
            tableWrapper,
            Math.min(limit, 8)
          );
        }
      }

      // Fetch files with pagination
      const result = await this.fetchFilesWithPagination(
        this.currentFolderId,
        page,
        limit
      );

      // Hide skeleton loading
      if (typeof skeletonManager !== "undefined" && skeletonManager) {
        skeletonManager.hideAllSkeletons();
      }

      // Handle response format
      let files, pagination;
      if (result.files && result.pagination) {
        // Paginated response
        files = result.files;
        pagination = result.pagination;
        this.currentFiles = files;
      } else {
        // Legacy response (array of files)
        files = Array.isArray(result) ? result : [];
        this.currentFiles = files;

        // Create pagination metadata for legacy response
        pagination = {
          totalFiles: files.length,
          totalPages: Math.ceil(files.length / limit),
          currentPage: page,
          limit: limit,
          hasNext: false,
          hasPrev: false,
        };
      }

      // Update pagination UI
      if (typeof paginationManager !== "undefined" && paginationManager) {
        paginationManager.updatePagination(pagination);
      }

      // Sort files using sortManager (client-side sorting for small datasets)
      const sortedFiles = sortManager ? sortManager.sortFiles(files) : files;

      if (!sortedFiles || !sortedFiles.length) {
        emptyNote.style.display = "block";
        tbody.innerHTML = "";

        if (typeof viewManager !== "undefined" && viewManager) {
          viewManager.renderFiles([]);
        }
        return;
      }

      emptyNote.style.display = "none";

      // Render files in current view
      if (
        typeof viewManager !== "undefined" &&
        viewManager &&
        viewManager.renderFiles(sortedFiles)
      ) {
        // ViewManager handled the rendering (grid view)
        tbody.innerHTML = "";
      } else {
        // Render list view (table)
        tbody.innerHTML = sortedFiles
          .map(file => this.renderFileRow(file))
          .join("");
      }

      // Notify multi-select manager about file list update
      if (multiSelectManager) {
        multiSelectManager.onFileListRendered();
      }

      // Setup drag and drop for file operations
      this.setupFileDragAndDrop();
    } catch (error) {
      console.error("Error loading files with pagination:", error);

      // Hide skeleton on error
      if (typeof skeletonManager !== "undefined" && skeletonManager) {
        skeletonManager.hideAllSkeletons();
      }

      const emptyNote = document.getElementById("emptyNote");
      if (emptyNote) {
        emptyNote.style.display = "block";
        emptyNote.innerHTML = "Lỗi tải danh sách file";
      }

      // Show error toast
      showToast("Lỗi tải file với phân trang", "error");
    }
  }

  // New method for fetching files with pagination
  async fetchFilesWithPagination(folderId, page = 1, limit = 50) {
    try {
      // Build URL with pagination parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (folderId) {
        params.append("parentId", folderId);
      }

      // Add sorting parameters if available
      if (
        typeof sortManager !== "undefined" &&
        sortManager &&
        typeof sortManager.getCurrentSort === "function"
      ) {
        try {
          const sortState = sortManager.getCurrentSort();
          if (sortState && sortState.column) {
            params.append("sortBy", sortState.column);
            params.append("sortOrder", sortState.direction);
          }
        } catch (error) {
          console.warn("Error getting sort state:", error);
        }
      }

      const url = `/api/files?${params.toString()}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const result = await res.json();
      return result;
    } catch (error) {
      console.error("Error fetching files with pagination:", error);
      throw error;
    }
  }

  renderFileRow(file) {
    return `
      <tr data-file-id="${file.id}" data-is-folder="${
      file.isFolder
    }" data-file-type="${file.isFolder ? "folder" : "file"}">
        <td class="col-name">
          ${getFileTypeIcon(file)}
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
              ? `
            <button class="btn-action btn-download-zip mdi mdi-folder-zip" title="Tải về dưới dạng ZIP" data-file-id="${file.id}" data-file-name="${file.name}"></button>
          `
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

  async openFolder(folderId, pushBread = true) {
    this.currentFolderId = folderId;

    // Always try to use pagination first for better performance
    if (typeof paginationManager !== "undefined" && paginationManager) {
      try {
        // Restore pagination state for this folder
        paginationManager.restoreFolderPageState(folderId);

        const page = paginationManager.getCurrentPage() || 1;
        const limit = paginationManager.getPageSize() || 50;

        // Use pagination for all folder loads
        await this.loadFilesWithPagination(page, limit);
      } catch (error) {
        console.warn(
          "Error using pagination, falling back to renderFiles:",
          error
        );
        await this.renderFiles(folderId);
      }
    } else {
      console.log("Pagination manager not available, using renderFiles");
      await this.renderFiles(folderId);
    }

    if (pushBread) {
      let name = "Tệp của bạn";
      if (folderId && this.folderNameMap[folderId]) {
        name = this.folderNameMap[folderId];
      } else if (folderId) {
        try {
          const res = await fetch("/api/folderinfo/" + folderId);
          const info = await res.json();
          name = info.name || "Thư mục";
          this.folderNameMap[folderId] = name;
        } catch {}
      }
      this.breadcrumbs.push({ id: folderId, name });
    }

    this.renderBreadcrumbs();
    fetchStorage();
  }

  renderBreadcrumbs() {
    const bc = document.getElementById("breadcrumbs");
    if (!this.breadcrumbs.length) return;

    bc.innerHTML = "";

    // Add breadcrumb dropdown for quick navigation if there are multiple levels
    if (this.breadcrumbs.length > 2) {
      bc.innerHTML += `
        <div class="breadcrumb-dropdown">
          <button class="breadcrumb-dropdown-btn" id="breadcrumbDropdownBtn">
            <span class="mdi mdi-dots-horizontal"></span>
          </button>
          <div class="breadcrumb-dropdown-menu" id="breadcrumbDropdownMenu">
            ${this.breadcrumbs
              .slice(0, -2)
              .map(
                (b, i) => `
              <div class="breadcrumb-dropdown-item" data-breadcrumb-index="${i}">
                <span class="mdi mdi-folder"></span>
                <span>${b.name}</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
        <span class="mdi mdi-chevron-right"></span>
      `;

      // Show last 2 breadcrumbs normally
      const visibleBreadcrumbs = this.breadcrumbs.slice(-2);
      visibleBreadcrumbs.forEach((b, i) => {
        const actualIndex = this.breadcrumbs.length - 2 + i;
        if (i > 0)
          bc.innerHTML += `<span class="mdi mdi-chevron-right"></span>`;
        if (i === visibleBreadcrumbs.length - 1) {
          bc.innerHTML += `<span class="breadcrumb-current">${b.name}</span>`;
        } else {
          bc.innerHTML += `<span class="breadcrumb-link" data-breadcrumb-index="${actualIndex}">${b.name}</span>`;
        }
      });
    } else {
      // Normal breadcrumb rendering for short paths
      this.breadcrumbs.forEach((b, i) => {
        if (i > 0)
          bc.innerHTML += `<span class="mdi mdi-chevron-right"></span>`;
        if (i === this.breadcrumbs.length - 1) {
          bc.innerHTML += `<span class="breadcrumb-current">${b.name}</span>`;
        } else {
          bc.innerHTML += `<span class="breadcrumb-link" data-breadcrumb-index="${i}">${b.name}</span>`;
        }
      });
    }

    // Setup dropdown events
    this.setupBreadcrumbDropdown();

    // Setup breadcrumb drop zones if drag operation is active
    if (
      typeof fileOperationsManager !== "undefined" &&
      fileOperationsManager &&
      fileOperationsManager.isDragging
    ) {
      fileOperationsManager.setupBreadcrumbDropZones();
    }
  }

  setupBreadcrumbDropdown() {
    const dropdownBtn = document.getElementById("breadcrumbDropdownBtn");
    const dropdownMenu = document.getElementById("breadcrumbDropdownMenu");

    if (!dropdownBtn || !dropdownMenu) return;

    // Toggle dropdown
    dropdownBtn.addEventListener("click", e => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", e => {
      if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.remove("show");
      }
    });

    // Handle dropdown item clicks
    dropdownMenu.addEventListener("click", e => {
      const item = e.target.closest(".breadcrumb-dropdown-item");
      if (item) {
        const index = parseInt(item.getAttribute("data-breadcrumb-index"));
        this.openFolderByBreadcrumb(index);
        dropdownMenu.classList.remove("show");
      }
    });
  }

  openFolderByBreadcrumb(idx) {
    const target = this.breadcrumbs[idx];
    this.breadcrumbs = this.breadcrumbs.slice(0, idx + 1);
    this.openFolder(target.id, false);
  }

  async createFolder(name) {
    if (!name || name.trim() === "") {
      showToast("Vui lòng nhập tên thư mục!", "error");
      return;
    }

    try {
      showToast("Đang tạo thư mục...", "info");

      // Build request body
      const requestBody = { name: name.trim() };

      // Only include parentId if it's not null/undefined
      if (this.currentFolderId) {
        requestBody.parentId = this.currentFolderId;
      }

      const res = await fetch("/api/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        // Use pagination-aware reload if available
        if (
          typeof paginationManager !== "undefined" &&
          paginationManager &&
          paginationManager.isActive()
        ) {
          const page = paginationManager.getCurrentPage();
          const limit = paginationManager.getPageSize();
          await this.loadFilesWithPagination(page, limit);
        } else {
          await this.renderFiles(this.currentFolderId);
        }
        showToast("Đã tạo thư mục!", "success");
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Create folder error:", errorData);
        showToast(
          `Lỗi tạo thư mục: ${errorData.error || "Unknown error"}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Create folder exception:", error);
      showToast("Lỗi tạo thư mục!", "error");
    }
  }

  async deleteFile(id, isFolder = false) {
    const itemType = isFolder ? "thư mục" : "file";

    const confirmed = await dialogManager.showConfirm({
      title: "Xác nhận xóa",
      message: `Bạn chắc chắn muốn chuyển ${itemType} này vào thùng rác?`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      type: "warning",
    });

    if (confirmed) {
      try {
        const res = await fetch("/api/delete/" + id, { method: "DELETE" });
        if (res.ok) {
          await this.renderFiles(this.currentFolderId);
          fetchStorage();
          showToast(
            `Đã chuyển ${itemType} vào thùng rác! Bạn có thể khôi phục từ thùng rác.`,
            "success"
          );
        } else {
          showToast("Xóa thất bại!", "error");
        }
      } catch {
        showToast("Lỗi xóa file/thư mục!", "error");
      }
    } else {
      showToast("Đã hủy thao tác xóa.", "info");
    }
  }

  async renameFile(fileId, oldName) {
    const newName = await dialogManager.showPrompt({
      title: "Đổi tên",
      message: "Nhập tên mới:",
      defaultValue: oldName,
      placeholder: "Tên file/thư mục...",
      confirmText: "Đổi tên",
      cancelText: "Hủy",
    });

    if (!newName || newName === oldName) return;

    showToast("Đang đổi tên...", "info");
    try {
      const res = await fetch("/api/rename/" + fileId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (res.ok) {
        await this.renderFiles(this.currentFolderId);
        showToast("Đã đổi tên thành công!", "success");
      } else {
        showToast("Lỗi đổi tên!", "error");
      }
    } catch {
      showToast("Lỗi đổi tên!", "error");
    }
  }

  async previewFile(fileId) {
    try {
      // Get current file list for navigation
      const files = await this.fetchFiles(this.currentFolderId);
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
          console.error("Error in preview manager:", previewError);
          showToast("Lỗi hiển thị preview!", "error");
        }
      } else {
        showToast("Preview manager không khả dụng!", "error");
      }
    } catch (error) {
      console.error("Preview error:", error);
      showToast("Lỗi mở xem trước!", "error");
    }
  }

  async downloadFile(fileId, fileName) {
    try {
      showToast(`Đang tải về "${fileName}"...`, "info");

      // Create download link and trigger download
      const downloadUrl = `/api/download/${fileId}`;

      // Create a temporary link and click it
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName; // Suggest filename
      link.style.display = "none";
      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Clean up
      document.body.removeChild(link);

      showToast(`Đã bắt đầu tải về "${fileName}"`, "success");
    } catch (error) {
      console.error("Error downloading file:", error);
      showToast("Lỗi tải về file!", "error");
    }
  }

  async downloadFolderAsZip(folderId, folderName) {
    try {
      showToast(`Đang chuẩn bị tải về thư mục "${folderName}"...`, "info");

      // Create download link and trigger download
      const downloadUrl = `/api/download-folder/${folderId}`;

      // Create a temporary link and click it
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.style.display = "none";
      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Clean up
      document.body.removeChild(link);

      showToast(`Đã bắt đầu tải về "${folderName}.zip"`, "success");
    } catch (error) {
      console.error("Error downloading folder as ZIP:", error);
      showToast("Lỗi tải về thư mục!", "error");
    }
  }

  // Setup drag and drop for file operations
  setupFileDragAndDrop() {
    if (
      typeof fileOperationsManager === "undefined" ||
      !fileOperationsManager
    ) {
      return; // File operations manager not available
    }

    // Setup drag and drop for all file rows
    const fileRows = document.querySelectorAll("tr[data-file-id]");
    fileRows.forEach(row => {
      const fileId = row.getAttribute("data-file-id");
      const isFolder = row.getAttribute("data-is-folder") === "true";

      // Find file data
      const fileData = this.currentFiles?.find(f => f.id === fileId);
      if (fileData) {
        fileOperationsManager.setupDragAndDrop(row, fileData);
      }
    });

    // Setup drag and drop for grid view items if they exist
    const gridItems = document.querySelectorAll(
      ".file-grid-item[data-file-id]"
    );
    gridItems.forEach(item => {
      const fileId = item.getAttribute("data-file-id");
      const fileData = this.currentFiles?.find(f => f.id === fileId);
      if (fileData) {
        fileOperationsManager.setupDragAndDrop(item, fileData);
      }
    });
  }

  // Virtual scroll info methods
  showVirtualScrollInfo(totalFiles) {
    let infoContainer = document.querySelector(".virtual-scroll-info");
    if (!infoContainer) {
      // Create info container if it doesn't exist
      infoContainer = document.createElement("div");
      infoContainer.className = "virtual-scroll-info";

      // Insert after search controls and before file list
      const searchControls = document.querySelector(".search-controls");
      if (searchControls && searchControls.nextSibling) {
        searchControls.parentNode.insertBefore(
          infoContainer,
          searchControls.nextSibling
        );
      } else {
        // Fallback: insert before table wrapper
        const tableWrapper = document.querySelector(".table-wrapper");
        if (tableWrapper) {
          tableWrapper.parentNode.insertBefore(infoContainer, tableWrapper);
        }
      }
    }

    infoContainer.innerHTML = `
      <div class="virtual-scroll-badge">
        <span class="mdi mdi-lightning-bolt"></span>
        <span>Virtual Scrolling Active</span>
        <span class="file-count">${totalFiles.toLocaleString()} files</span>
      </div>
    `;
    infoContainer.style.display = "block";
  }

  hideVirtualScrollInfo() {
    const infoContainer = document.querySelector(".virtual-scroll-info");
    if (infoContainer) {
      infoContainer.style.display = "none";
    }
  }
}

// Export instance
const fileManager = new FileManager();
