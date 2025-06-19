// Recycle Bin Manager Module
class RecycleBinManager {
  constructor() {
    this.trashedFiles = [];
    this.isLoading = false;
  }

  init() {
    this.setupEventListeners();
    this.loadTrashedFiles();
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
        this.loadTrashedFiles();
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

      // Handle locate button clicks
      if (e.target.classList.contains("btn-locate")) {
        const fileId = e.target.getAttribute("data-file-id");
        const fileName = e.target.getAttribute("data-file-name");
        if (fileId && fileName) {
          this.showOriginalLocation(fileId, fileName);
        }
      }
    });

    // Modal event listeners
    this.setupModalListeners();
  }

  setupModalListeners() {
    const modal = document.getElementById("confirmModal");
    const modalClose = document.getElementById("modalClose");
    const modalCancel = document.getElementById("modalCancel");
    const modalConfirm = document.getElementById("modalConfirm");

    if (modalClose) {
      modalClose.addEventListener("click", () => this.hideModal());
    }

    if (modalCancel) {
      modalCancel.addEventListener("click", () => this.hideModal());
    }

    // Click outside modal to close
    if (modal) {
      modal.addEventListener("click", e => {
        if (e.target === modal) {
          this.hideModal();
        }
      });
    }
  }

  async loadTrashedFiles() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showProgress("Đang tải danh sách thùng rác...");

    try {
      const response = await fetch("/api/trash");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.trashedFiles = await response.json();
      this.renderTrashedFiles();
    } catch (error) {
      console.error("Error loading trashed files:", error);
      showToast("Lỗi tải danh sách thùng rác!", "error");
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
            <button class="btn-action btn-locate mdi mdi-map-marker"
                    title="Vị trí gốc"
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

  permanentlyDeleteFile(fileId, fileName, isFolder = false) {
    const itemType = isFolder ? "thư mục" : "tệp";

    this.showModal(
      "Xóa vĩnh viễn",
      `Bạn có chắc chắn muốn xóa vĩnh viễn ${itemType} "${fileName}"? Hành động này không thể hoàn tác!`,
      async () => {
        await this.performPermanentDelete(fileId, fileName, isFolder);
      }
    );
  }

  async performPermanentDelete(fileId, fileName, isFolder) {
    this.hideModal();
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

  emptyTrash() {
    if (!this.trashedFiles || this.trashedFiles.length === 0) {
      showToast("Thùng rác đã trống!", "info");
      return;
    }

    this.showModal(
      "Xóa tất cả",
      `Bạn có chắc chắn muốn xóa vĩnh viễn tất cả ${this.trashedFiles.length} mục trong thùng rác? Hành động này không thể hoàn tác!`,
      async () => {
        await this.performEmptyTrash();
      }
    );
  }

  async performEmptyTrash() {
    this.hideModal();
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

  showModal(title, message, onConfirm) {
    const modal = document.getElementById("confirmModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalMessage = document.getElementById("modalMessage");
    const modalConfirm = document.getElementById("modalConfirm");

    if (!modal || !modalTitle || !modalMessage || !modalConfirm) {
      console.error("Modal elements not found");
      return;
    }

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Remove previous event listeners
    const newConfirmBtn = modalConfirm.cloneNode(true);
    modalConfirm.parentNode.replaceChild(newConfirmBtn, modalConfirm);

    // Add new event listener
    newConfirmBtn.addEventListener("click", () => {
      if (onConfirm) {
        onConfirm();
      }
    });

    modal.style.display = "flex";
  }

  hideModal() {
    const modal = document.getElementById("confirmModal");
    if (modal) {
      modal.style.display = "none";
    }
  }

  showOriginalLocation(fileId, fileName) {
    const file = this.trashedFiles.find(f => f.id === fileId);
    if (file && file.originalPath) {
      showToast(`Vị trí gốc của "${fileName}": ${file.originalPath}`, "info");
    } else {
      showToast(`Không tìm thấy vị trí gốc của "${fileName}"`, "warning");
    }
  }
}

// Export instance
const recycleBinManager = new RecycleBinManager();
