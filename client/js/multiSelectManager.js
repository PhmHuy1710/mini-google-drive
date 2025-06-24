// Multi-select Manager Module
class MultiSelectManager {
  constructor() {
    this.selectedFiles = new Set();
    this.isSelectionMode = false;
    this.isInitialized = false;
    // Don't setup immediately, wait for DOM ready
    this.setupEventListeners();
  }

  setupUI() {
    // Add select all checkbox to table header
    this.addSelectAllCheckbox();

    // Create bulk actions toolbar (initially hidden)
    this.createBulkActionsToolbar();
  }

  addSelectAllCheckbox() {
    const fileTable = document.querySelector(".file-list");
    if (!fileTable) return;

    // Add checkbox column header
    const headerRow = fileTable.querySelector("thead tr");
    if (headerRow) {
      const checkboxHeader = document.createElement("th");
      checkboxHeader.className = "col-checkbox";
      checkboxHeader.innerHTML = `
        <div class="checkbox-container">
          <input type="checkbox" id="selectAllCheckbox" class="file-checkbox select-all-checkbox">
          <label for="selectAllCheckbox" class="checkbox-label"></label>
        </div>
      `;
      headerRow.insertBefore(checkboxHeader, headerRow.firstChild);
    }
  }

  createBulkActionsToolbar() {
    const toolbar = document.querySelector(".toolbar");
    const bulkToolbar = document.createElement("div");
    bulkToolbar.className = "bulk-actions-toolbar";
    bulkToolbar.id = "bulkActionsToolbar";
    bulkToolbar.innerHTML = `
      <div class="bulk-actions-content">
        <div class="bulk-selection-info">
          <span class="mdi mdi-checkbox-marked-circle"></span>
          <span id="selectionCount">0</span> file đã chọn
        </div>
        <div class="bulk-actions">
          <button class="btn-bulk-action btn-bulk-download" id="bulkDownloadBtn" title="Tải về nhiều file">
            <span class="mdi mdi-download-multiple"></span>
            <span>Tải về</span>
          </button>
          <button class="btn-bulk-action btn-bulk-delete" id="bulkDeleteBtn" title="Xóa nhiều file">
            <span class="mdi mdi-delete-multiple"></span>
            <span>Xóa</span>
          </button>
          <button class="btn-bulk-action btn-bulk-clear" id="bulkClearBtn" title="Bỏ chọn tất cả">
            <span class="mdi mdi-close"></span>
            <span>Bỏ chọn</span>
          </button>
        </div>
      </div>
    `;

    // Insert after main toolbar
    toolbar.parentNode.insertBefore(bulkToolbar, toolbar.nextSibling);
  }

  setupEventListeners() {
    // Select all checkbox
    document.addEventListener("change", e => {
      if (e.target.id === "selectAllCheckbox") {
        this.toggleSelectAll(e.target.checked);
      } else if (
        e.target.classList.contains("file-checkbox") &&
        !e.target.classList.contains("select-all-checkbox")
      ) {
        this.handleFileCheckboxChange(e.target);
      }
    });

    // Bulk action buttons
    document.addEventListener("click", e => {
      if (e.target.closest("#bulkDownloadBtn")) {
        this.bulkDownload();
      } else if (e.target.closest("#bulkDeleteBtn")) {
        this.bulkDelete();
      } else if (e.target.closest("#bulkClearBtn")) {
        this.clearSelection();
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", e => {
      // Ctrl+A: Select all
      if (e.ctrlKey && e.key === "a" && !e.target.matches("input, textarea")) {
        e.preventDefault();
        this.selectAll();
      }

      // Delete key: Delete selected files
      if (
        e.key === "Delete" &&
        this.selectedFiles.size > 0 &&
        !e.target.matches("input, textarea")
      ) {
        e.preventDefault();
        this.bulkDelete();
      }

      // Escape: Clear selection
      if (e.key === "Escape" && this.isSelectionMode) {
        this.clearSelection();
      }
    });

    // Row clicks for selection
    document.addEventListener("click", e => {
      const row = e.target.closest("tr[data-file-id]");
      if (!row) return;

      // Click on row (not on action buttons) to toggle selection
      if (
        !e.target.closest(
          ".action-group, .btn-action, .file-checkbox, .folder-link, .file-link"
        )
      ) {
        const checkbox = row.querySelector(".file-checkbox");
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          this.handleFileCheckboxChange(checkbox);
        }
      }
    });
  }

  addCheckboxToRow(row, fileId) {
    const checkboxCell = document.createElement("td");
    checkboxCell.className = "col-checkbox";
    checkboxCell.innerHTML = `
      <div class="checkbox-container">
        <input type="checkbox" id="checkbox_${fileId}" class="file-checkbox" data-file-id="${fileId}">
        <label for="checkbox_${fileId}" class="checkbox-label"></label>
      </div>
    `;
    row.insertBefore(checkboxCell, row.firstChild);
  }

  toggleSelectAll(checked) {
    const fileCheckboxes = document.querySelectorAll(
      ".file-checkbox:not(.select-all-checkbox)"
    );
    fileCheckboxes.forEach(checkbox => {
      checkbox.checked = checked;
      const fileId = checkbox.dataset.fileId;
      if (checked) {
        this.selectedFiles.add(fileId);
      } else {
        this.selectedFiles.delete(fileId);
      }
    });

    this.updateSelectionUI();
  }

  selectAll() {
    const selectAllCheckbox = document.getElementById("selectAllCheckbox");
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = true;
      this.toggleSelectAll(true);
    }
  }

  handleFileCheckboxChange(checkbox) {
    const fileId = checkbox.dataset.fileId;

    if (checkbox.checked) {
      this.selectedFiles.add(fileId);
    } else {
      this.selectedFiles.delete(fileId);
    }

    this.updateSelectAllState();
    this.updateSelectionUI();
  }

  updateSelectAllState() {
    const selectAllCheckbox = document.getElementById("selectAllCheckbox");
    const fileCheckboxes = document.querySelectorAll(
      ".file-checkbox:not(.select-all-checkbox)"
    );
    const checkedCheckboxes = document.querySelectorAll(
      ".file-checkbox:not(.select-all-checkbox):checked"
    );

    if (selectAllCheckbox) {
      if (checkedCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      } else if (checkedCheckboxes.length === fileCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
      } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
      }
    }
  }

  updateSelectionUI() {
    const bulkToolbar = document.getElementById("bulkActionsToolbar");
    const selectionCount = document.getElementById("selectionCount");

    // Check if UI elements exist
    if (!bulkToolbar || !selectionCount) return;

    if (this.selectedFiles.size > 0) {
      this.isSelectionMode = true;
      bulkToolbar.classList.add("show");
      selectionCount.textContent = this.selectedFiles.size;

      // Update table styling
      document.body.classList.add("selection-mode");
    } else {
      this.isSelectionMode = false;
      bulkToolbar.classList.remove("show");
      document.body.classList.remove("selection-mode");
    }

    // Update bulk action button states
    this.updateBulkActionStates();
  }

  updateBulkActionStates() {
    const downloadBtn = document.getElementById("bulkDownloadBtn");
    const deleteBtn = document.getElementById("bulkDeleteBtn");

    // Safety check for button existence
    if (!downloadBtn || !deleteBtn) return;

    const hasSelection = this.selectedFiles.size > 0;
    const selectedData = this.getSelectedFilesData();
    const hasNonFolders = selectedData.some(file => !file.isFolder);

    downloadBtn.disabled = !hasNonFolders;
    deleteBtn.disabled = !hasSelection;
  }

  getSelectedFilesData() {
    const selectedData = [];
    this.selectedFiles.forEach(fileId => {
      const row = document.querySelector(`tr[data-file-id="${fileId}"]`);
      if (row) {
        const isFolder = row.dataset.isFolder === "true";
        const fileName = row.querySelector(
          ".folder-link, .file-link"
        )?.textContent;
        selectedData.push({
          id: fileId,
          isFolder,
          name: fileName,
        });
      }
    });
    return selectedData;
  }

  async bulkDownload() {
    const selectedData = this.getSelectedFilesData();
    const downloadableFiles = selectedData.filter(file => !file.isFolder);

    if (downloadableFiles.length === 0) {
      showToast("Không có file nào để tải về!", "error");
      return;
    }

    if (downloadableFiles.length === 1) {
      // Single file download with toast notification
      if (typeof fileManager !== "undefined" && fileManager) {
        fileManager.downloadFile(
          downloadableFiles[0].id,
          downloadableFiles[0].name
        );
      } else {
        // Fallback
        window.open(`/api/download/${downloadableFiles[0].id}`, "_blank");
        showToast("Đang tải file...", "info");
      }
    } else {
      // Multiple files - show initial toast then stagger downloads
      showToast(`Đang tải ${downloadableFiles.length} file...`, "info");

      downloadableFiles.forEach((file, index) => {
        setTimeout(() => {
          if (typeof fileManager !== "undefined" && fileManager) {
            // Use fileManager method for consistency (but don't show individual toasts for bulk)
            const link = document.createElement("a");
            link.href = `/api/download/${file.id}`;
            link.download = file.name;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else {
            // Fallback
            window.open(`/api/download/${file.id}`, "_blank");
          }
        }, index * 500); // Stagger downloads
      });
    }
  }

  async bulkDelete() {
    const selectedData = this.getSelectedFilesData();

    if (selectedData.length === 0) return;

    const fileCount = selectedData.filter(f => !f.isFolder).length;
    const folderCount = selectedData.filter(f => f.isFolder).length;

    let confirmMessage = "Bạn chắc chắn muốn xóa ";
    if (fileCount > 0 && folderCount > 0) {
      confirmMessage += `${fileCount} file và ${folderCount} thư mục?`;
    } else if (fileCount > 0) {
      confirmMessage += `${fileCount} file?`;
    } else {
      confirmMessage += `${folderCount} thư mục?`;
    }

    const confirmed = await dialogManager.showConfirm({
      title: "Xác nhận xóa hàng loạt",
      message: confirmMessage,
      confirmText: "Xóa tất cả",
      cancelText: "Hủy",
      type: "warning",
    });

    if (confirmed) {
      try {
        showToast("Đang xóa...", "info");
        const deletePromises = Array.from(this.selectedFiles).map(fileId =>
          fetch(`/api/delete/${fileId}`, { method: "DELETE" })
        );

        const results = await Promise.allSettled(deletePromises);
        const successful = results.filter(
          r => r.status === "fulfilled" && r.value.ok
        ).length;
        const failed = results.length - successful;

        if (successful > 0) {
          this.clearSelection();
          await fileManager.renderFiles(fileManager.currentFolderId);
          fetchStorage();

          if (failed === 0) {
            showToast(`Đã xóa ${successful} mục!`, "success");
          } else {
            showToast(`Đã xóa ${successful} mục, ${failed} mục lỗi`, "warning");
          }
        } else {
          showToast("Không thể xóa file/thư mục!", "error");
        }
      } catch (error) {
        console.error("Bulk delete error:", error);
        showToast("Lỗi xóa file!", "error");
      }
    } else {
      showToast("Đã hủy thao tác xóa.", "info");
    }
  }

  clearSelection() {
    this.selectedFiles.clear();

    // Uncheck all checkboxes
    const checkboxes = document.querySelectorAll(".file-checkbox");
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
      checkbox.indeterminate = false;
    });

    this.updateSelectionUI();
  }

  // Initialize UI when DOM is ready
  initialize() {
    if (!this.isInitialized) {
      this.setupUI();
      this.isInitialized = true;
    }
  }

  // Call this when file list is re-rendered
  onFileListRendered() {
    // Initialize if not done yet
    if (!this.isInitialized) {
      this.initialize();
    }

    // Add checkboxes to all file rows
    const fileRows = document.querySelectorAll("tr[data-file-id]");
    fileRows.forEach(row => {
      const fileId = row.dataset.fileId;
      if (!row.querySelector(".col-checkbox")) {
        this.addCheckboxToRow(row, fileId);
      }

      // Restore selection state
      const checkbox = row.querySelector(".file-checkbox");
      if (checkbox && this.selectedFiles.has(fileId)) {
        checkbox.checked = true;
      }
    });

    this.updateSelectAllState();
    this.updateSelectionUI();
  }

  getSelectedCount() {
    return this.selectedFiles.size;
  }

  hasSelectedFiles() {
    return this.selectedFiles.size > 0;
  }

  // Select a specific file (used by context menu operations)
  selectFile(fileId) {
    this.selectedFiles.add(fileId);

    // Update checkbox if it exists
    const checkbox = document.querySelector(`input[data-file-id="${fileId}"]`);
    if (checkbox) {
      checkbox.checked = true;
    }

    this.updateSelectAllState();
    this.updateSelectionUI();
  }

  // Alias for legacy compatibility
  deselectAll() {
    this.clearSelection();
  }
}

// Export instance
const multiSelectManager = new MultiSelectManager();
