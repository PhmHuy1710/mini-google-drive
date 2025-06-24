// Recycle Bin Manager Module
class RecycleBinManager {
  constructor() {
    this.trashedFiles = [];
    this.isLoading = false;
  }

  init() {
    this.setupEventListeners();

    // Initialize pagination for recycle bin
    if (typeof paginationManager !== "undefined" && paginationManager) {
      // Connect pagination manager to recycleBinManager
      this.setupPaginationIntegration();
    }

    this.loadTrashedFiles();

    // Initialize mobile action manager for recycle bin
    if (typeof mobileActionManager !== "undefined") {
      this.setupMobileActions();
    }
  }

  setupPaginationIntegration() {
    // Override pagination manager's goToPage method for recycle bin
    if (typeof paginationManager !== "undefined" && paginationManager) {
      const originalGoToPage =
        paginationManager.goToPage.bind(paginationManager);

      paginationManager.goToPage = page => {
        if (window.location.pathname.includes("recycle-bin.html")) {
          // Handle pagination for recycle bin
          if (
            page < 1 ||
            page > paginationManager.totalPages ||
            page === paginationManager.currentPage
          ) {
            return;
          }

          const limit = paginationManager.getPageSize();
          this.loadTrashedFiles(page, limit);
          showToast(`Chuyển đến trang ${page}`, "info");
        } else {
          // Use original implementation for main page
          originalGoToPage(page);
        }
      };
    }
  }

  setupEventListeners() {
    // Back to main button
    const backBtn = document.getElementById("backToMainBtn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        window.location.href = "index.html";
      });
    }

    // Empty trash button
    const emptyTrashBtn = document.getElementById("emptyTrashBtn");
    if (emptyTrashBtn) {
      emptyTrashBtn.addEventListener("click", () => {
        this.emptyTrash();
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById("refreshTrashBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        // Use pagination-aware refresh if available
        if (
          typeof paginationManager !== "undefined" &&
          paginationManager &&
          paginationManager.isActive()
        ) {
          const page = paginationManager.getCurrentPage();
          const limit = paginationManager.getPageSize();
          this.loadTrashedFiles(page, limit);
        } else {
          this.loadTrashedFiles();
        }
      });
    }

    // Use event delegation for dynamically created elements
    document.addEventListener("click", e => {
      // Handle restore button clicks
      if (e.target.classList.contains("btn-restore")) {
        const fileId = e.target.getAttribute("data-file-id");
        const fileName = e.target.getAttribute("data-file-name");
        if (fileId && fileName) {
          this.restoreFile(fileId, fileName);
        }
      }

      // Handle permanent delete button clicks
      if (e.target.classList.contains("btn-permanent-delete")) {
        const fileId = e.target.getAttribute("data-file-id");
        const fileName = e.target.getAttribute("data-file-name");
        const isFolder = e.target.getAttribute("data-is-folder") === "true";
        if (fileId && fileName) {
          this.permanentlyDeleteFile(fileId, fileName, isFolder);
        }
      }
    });
  }

  async loadTrashedFiles(page = 1, limit = 50) {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showProgress("Đang tải danh sách thùng rác...");

    // Show skeleton loading
    const tableWrapper = document.querySelector(".table-wrapper");
    if (tableWrapper && typeof skeletonManager !== "undefined") {
      // Show skeleton for trash table
      skeletonManager.showTrashSkeleton(tableWrapper, 6);
    }

    try {
      // Try paginated approach first
      let response, data;

      if (typeof paginationManager !== "undefined" && paginationManager) {
        // Use pagination parameters
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        response = await fetch(`/api/trash?${params.toString()}`);
      } else {
        // Fallback to simple fetch
        response = await fetch("/api/trash");
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      data = await response.json();

      // Handle both paginated and legacy response format
      if (data.files && data.pagination) {
        // Paginated response
        this.trashedFiles = data.files;

        // Update pagination UI if available
        if (typeof paginationManager !== "undefined" && paginationManager) {
          paginationManager.updatePagination(data.pagination);
        }
      } else {
        // Legacy array response
        this.trashedFiles = Array.isArray(data) ? data : [];

        // Create pagination metadata for UI
        if (typeof paginationManager !== "undefined" && paginationManager) {
          const pagination = {
            totalFiles: this.trashedFiles.length,
            totalPages: Math.ceil(this.trashedFiles.length / limit),
            currentPage: page,
            limit: limit,
            hasNext: false,
            hasPrev: false,
          };
          paginationManager.updatePagination(pagination);
        }
      }

      // Hide skeleton before rendering
      if (typeof skeletonManager !== "undefined") {
        skeletonManager.hideSkeleton("file-table");
      }

      this.renderTrashedFiles();
    } catch (error) {
      console.error("Error loading trashed files:", error);
      showToast("Lỗi tải danh sách thùng rác!", "error");

      // Hide skeleton on error
      if (typeof skeletonManager !== "undefined") {
        skeletonManager.hideSkeleton("file-table");
      }

      this.showEmptyState();
    } finally {
      this.isLoading = false;
      this.hideProgress();
    }
  }

  renderTrashedFiles() {
    const tbody = document.getElementById("trashListBody");
    const emptyNote = document.getElementById("emptyTrashNote");
    const table = document.getElementById("trashTable");

    if (!tbody || !emptyNote || !table) {
      console.error("Required DOM elements not found");
      return;
    }

    tbody.innerHTML = "";

    if (!this.trashedFiles || this.trashedFiles.length === 0) {
      this.showEmptyState();
      return;
    }

    // Hide empty state and show table
    emptyNote.style.display = "none";
    table.style.display = "table";

    // Render each trashed file
    tbody.innerHTML = this.trashedFiles
      .map(file => this.renderTrashedFileRow(file))
      .join("");

    // Setup mobile actions for new rows
    if (typeof mobileActionManager !== "undefined") {
      this.setupMobileActionsForRows();
    }
  }

  renderTrashedFileRow(file) {
    const trashedDate = file.trashedTime
      ? new Date(file.trashedTime).toLocaleString("vi-VN")
      : "Không rõ";

    return `
      <tr data-file-id="${file.id}" data-is-folder="${file.isFolder}">
        <td class="col-name">
          ${getFileTypeIcon(file)}
          <span class="file-name" style="color: #666;">${file.name}</span>
        </td>
        <td class="col-time">${trashedDate}</td>
        <td class="col-size">${file.size ? formatSize(file.size) : ""}</td>
        <td class="col-action">
          <div class="action-group">
            <button class="btn-action btn-restore mdi mdi-restore"
                    title="Khôi phục"
                    data-file-id="${file.id}"
                    data-file-name="${file.name}">
            </button>
            <button class="btn-action btn-permanent-delete mdi mdi-delete-forever"
                    title="Xóa vĩnh viễn"
                    data-file-id="${file.id}"
                    data-file-name="${file.name}"
                    data-is-folder="${file.isFolder}">
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  showEmptyState() {
    const emptyNote = document.getElementById("emptyTrashNote");
    const table = document.getElementById("trashTable");

    if (emptyNote && table) {
      emptyNote.style.display = "block";
      table.style.display = "none";
    }

    // Also hide any remaining skeletons
    if (typeof skeletonManager !== "undefined") {
      skeletonManager.hideSkeleton("file-table");
    }
  }

  showProgress(message) {
    const progressWrap = document.getElementById("progressWrap");
    const progressText = document.getElementById("progressText");

    if (progressWrap && progressText) {
      progressText.textContent = message;
      progressWrap.style.display = "flex";
    }
  }

  hideProgress() {
    const progressWrap = document.getElementById("progressWrap");
    if (progressWrap) {
      progressWrap.style.display = "none";
    }
  }

  async restoreFile(fileId, fileName) {
    this.showProgress(`Đang khôi phục "${fileName}"...`);

    try {
      const response = await fetch(`/api/restore/${fileId}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Remove from local array
      this.trashedFiles = this.trashedFiles.filter(file => file.id !== fileId);

      // Re-render the list
      this.renderTrashedFiles();

      showToast(`Đã khôi phục "${fileName}" thành công!`, "success");
    } catch (error) {
      console.error("Error restoring file:", error);
      showToast(`Lỗi khôi phục "${fileName}"!`, "error");
    } finally {
      this.hideProgress();
    }
  }

  async permanentlyDeleteFile(fileId, fileName, isFolder = false) {
    const itemType = isFolder ? "thư mục" : "tệp";

    const confirmed = await dialogManager.showConfirm({
      title: "Xóa vĩnh viễn",
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn ${itemType} "${fileName}"? Hành động này không thể hoàn tác!`,
      confirmText: "Xóa vĩnh viễn",
      cancelText: "Hủy",
      type: "danger",
    });

    if (confirmed) {
      await this.performPermanentDelete(fileId, fileName, isFolder);
    }
  }

  async performPermanentDelete(fileId, fileName, isFolder) {
    this.showProgress(`Đang xóa vĩnh viễn "${fileName}"...`);

    try {
      const response = await fetch(`/api/permanent-delete/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Remove from local array
      this.trashedFiles = this.trashedFiles.filter(file => file.id !== fileId);

      // Re-render the list
      this.renderTrashedFiles();

      const itemType = isFolder ? "thư mục" : "tệp";
      showToast(`Đã xóa vĩnh viễn ${itemType} "${fileName}"!`, "success");
    } catch (error) {
      console.error("Error permanently deleting file:", error);
      showToast(`Lỗi xóa vĩnh viễn "${fileName}"!`, "error");
    } finally {
      this.hideProgress();
    }
  }

  async emptyTrash() {
    if (!this.trashedFiles || this.trashedFiles.length === 0) {
      showToast("Thùng rác đã trống!", "info");
      return;
    }

    const confirmed = await dialogManager.showConfirm({
      title: "Xóa tất cả",
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn tất cả ${this.trashedFiles.length} mục trong thùng rác? Hành động này không thể hoàn tác!`,
      confirmText: "Xóa tất cả",
      cancelText: "Hủy",
      type: "danger",
    });

    if (confirmed) {
      await this.performEmptyTrash();
    }
  }

  async performEmptyTrash() {
    this.showProgress("Đang xóa tất cả...");

    try {
      const response = await fetch("/api/empty-trash", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Clear local array
      this.trashedFiles = [];

      // Re-render the list
      this.renderTrashedFiles();

      showToast(`Đã xóa vĩnh viễn ${result.deletedCount} mục!`, "success");
    } catch (error) {
      console.error("Error emptying trash:", error);
      showToast("Lỗi xóa tất cả!", "error");
    } finally {
      this.hideProgress();
    }
  }

  setupMobileActions() {
    // Setup mobile action event listeners
    if (typeof mobileActionManager !== "undefined") {
      // Override mobile action execution for recycle bin
      const originalExecuteMobileAction =
        mobileActionManager.executeMobileAction.bind(mobileActionManager);
      mobileActionManager.executeMobileAction = action => {
        const file = mobileActionManager.getCurrentFile();
        if (!file) return;

        switch (action) {
          case "restore":
            this.restoreFile(file.id, file.name);
            break;
          case "delete-forever":
            this.permanentlyDeleteFile(file.id, file.name, file.isFolder);
            break;
          default:
            // Fall back to original implementation for other actions
            originalExecuteMobileAction(action);
        }
      };
    }
  }

  setupMobileActionsForRows() {
    // Add mobile action triggers to each row
    const rows = document.querySelectorAll("#trashTable tbody tr");
    rows.forEach(row => {
      if (typeof mobileActionManager !== "undefined") {
        mobileActionManager.addActionTriggerToRow(row);
      }
    });
  }
}

// Export instance
const recycleBinManager = new RecycleBinManager();
