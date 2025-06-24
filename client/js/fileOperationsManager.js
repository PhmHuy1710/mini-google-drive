class FileOperationsManager {
  constructor() {
    this.draggedFiles = [];
    this.isDragging = false;
    this.dropZones = new Map();
    this.currentOperation = null; // 'move' or 'copy'
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.createDropIndicator();
    console.log("🔄 File Operations Manager initialized");
  }

  setupEventListeners() {
    // Keyboard shortcuts for operations
    document.addEventListener(
      "keydown",
      this.handleKeyboardShortcuts.bind(this)
    );

    // Context menu integration
    document.addEventListener(
      "fileOperationRequested",
      this.handleOperationRequest.bind(this)
    );

    // Bulk operations integration
    document.addEventListener(
      "bulkOperationRequested",
      this.handleBulkOperation.bind(this)
    );
  }

  createDropIndicator() {
    this.dropIndicator = document.createElement("div");
    this.dropIndicator.className = "drop-indicator";
    this.dropIndicator.innerHTML = `
      <div class="drop-indicator-content">
        <span class="mdi mdi-folder-move"></span>
        <span class="drop-indicator-text">Thả vào đây để di chuyển</span>
      </div>
    `;
    document.body.appendChild(this.dropIndicator);
  }

  handleKeyboardShortcuts(e) {
    // Ctrl+X = Cut (prepare for move)
    if (e.ctrlKey && e.key === "x") {
      const selectedFiles = this.getSelectedFiles();
      if (selectedFiles.length > 0) {
        this.prepareCutOperation(selectedFiles);
        e.preventDefault();
      }
    }

    // Ctrl+C = Copy (prepare for copy)
    if (e.ctrlKey && e.key === "c") {
      const selectedFiles = this.getSelectedFiles();
      if (selectedFiles.length > 0) {
        this.prepareCopyOperation(selectedFiles);
        e.preventDefault();
      }
    }

    // Ctrl+V = Paste
    if (e.ctrlKey && e.key === "v") {
      if (this.currentOperation) {
        this.executePasteOperation();
        e.preventDefault();
      }
    }

    // Escape = Cancel operation
    if (e.key === "Escape") {
      this.cancelCurrentOperation();
    }
  }

  getSelectedFiles() {
    if (
      typeof multiSelectManager !== "undefined" &&
      multiSelectManager.hasSelectedFiles()
    ) {
      return multiSelectManager.getSelectedFilesData();
    }
    return [];
  }

  prepareCutOperation(files) {
    this.currentOperation = {
      type: "move",
      files: files,
      timestamp: Date.now(),
    };

    this.highlightCutFiles(files);
    showToast(`Đã cắt ${files.length} mục. Nhấn Ctrl+V để dán.`, "info");
  }

  prepareCopyOperation(files) {
    this.currentOperation = {
      type: "copy",
      files: files,
      timestamp: Date.now(),
    };

    showToast(`Đã sao chép ${files.length} mục. Nhấn Ctrl+V để dán.`, "info");
  }

  highlightCutFiles(files) {
    // Remove previous highlights
    document.querySelectorAll(".file-cut").forEach(el => {
      el.classList.remove("file-cut");
    });

    // Add highlight to cut files
    files.forEach(file => {
      const fileRow = document.querySelector(`tr[data-file-id="${file.id}"]`);
      if (fileRow) {
        fileRow.classList.add("file-cut");
      }
    });
  }

  async executePasteOperation() {
    if (!this.currentOperation) {
      showToast("Không có thao tác nào để dán", "warning");
      return;
    }

    const targetFolderId = fileManager.currentFolderId;
    const operation = this.currentOperation;

    try {
      let response;
      if (operation.type === "move") {
        response = await this.moveFiles(
          operation.files.map(f => f.id),
          targetFolderId
        );
        showToast(`Đã di chuyển ${response.moved} mục`, "success");
      } else if (operation.type === "copy") {
        response = await this.copyFiles(
          operation.files.map(f => f.id),
          targetFolderId
        );
        showToast(`Đã sao chép ${response.copied} mục`, "success");
      }

      // Refresh current folder
      if (typeof fileManager !== "undefined") {
        await fileManager.renderFiles(fileManager.currentFolderId);
      }

      this.cancelCurrentOperation();
    } catch (error) {
      console.error("Paste operation failed:", error);
      showToast("Thao tác thất bại: " + error.message, "error");
    }
  }

  cancelCurrentOperation() {
    if (this.currentOperation) {
      // Remove cut highlights
      document.querySelectorAll(".file-cut").forEach(el => {
        el.classList.remove("file-cut");
      });

      this.currentOperation = null;
      showToast("Đã hủy thao tác", "info");
    }
  }

  // Setup drag and drop for file rows
  setupDragAndDrop(fileRow, fileData) {
    fileRow.draggable = true;

    fileRow.addEventListener("dragstart", e => {
      this.handleDragStart(e, fileData);
    });

    fileRow.addEventListener("dragend", () => {
      this.handleDragEnd();
    });

    // Only allow dropping on folders
    if (fileData.isFolder) {
      fileRow.addEventListener("dragover", e => {
        this.handleDragOver(e);
      });

      fileRow.addEventListener("drop", e => {
        this.handleDrop(e, fileData.id);
      });

      fileRow.addEventListener("dragenter", () => {
        fileRow.classList.add("drag-over");
      });

      fileRow.addEventListener("dragleave", () => {
        fileRow.classList.remove("drag-over");
      });
    }
  }

  handleDragStart(e, fileData) {
    const selectedFiles = this.getSelectedFiles();

    if (
      selectedFiles.length > 0 &&
      selectedFiles.find(f => f.id === fileData.id)
    ) {
      // Dragging selected files
      this.draggedFiles = selectedFiles;
    } else {
      // Dragging single file
      this.draggedFiles = [fileData];
    }

    this.isDragging = true;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ""); // Required for some browsers

    // Set drag image
    const dragCount = this.draggedFiles.length;
    if (dragCount > 1) {
      const dragImage = this.createDragImage(dragCount);
      e.dataTransfer.setDragImage(dragImage, 20, 20);
    }

    // Show helpful toast for breadcrumb navigation
    const breadcrumbCount =
      document.querySelectorAll(".breadcrumb-link").length;
    if (breadcrumbCount > 1) {
      showToast("💡 Thả file vào breadcrumb để di chuyển nhanh!", "info");
    }

    // Show drop zones
    this.showDropZones();
  }

  createDragImage(count) {
    const dragImage = document.createElement("div");
    dragImage.className = "drag-image";
    dragImage.innerHTML = `
      <span class="mdi mdi-file-multiple"></span>
      <span class="drag-count">${count}</span>
    `;

    // Position off-screen
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    dragImage.style.left = "-1000px";

    document.body.appendChild(dragImage);

    // Clean up after a short delay
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);

    return dragImage;
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async handleDrop(e, targetFolderId) {
    e.preventDefault();
    e.stopPropagation();

    const targetRow = e.currentTarget;
    targetRow.classList.remove("drag-over");

    if (!this.isDragging || this.draggedFiles.length === 0) {
      return;
    }

    // Check if dropping on self
    const droppingSelf = this.draggedFiles.some(
      file => file.id === targetFolderId
    );
    if (droppingSelf) {
      showToast("Không thể di chuyển thư mục vào chính nó", "warning");
      return;
    }

    try {
      const fileIds = this.draggedFiles.map(f => f.id);
      const response = await this.moveFiles(fileIds, targetFolderId);

      showToast(`Đã di chuyển ${response.moved} mục vào thư mục`, "success");

      // Refresh current folder
      if (typeof fileManager !== "undefined") {
        await fileManager.renderFiles(fileManager.currentFolderId);
      }

      // Clear selection if using multiSelect
      if (typeof multiSelectManager !== "undefined") {
        multiSelectManager.clearSelection();
      }
    } catch (error) {
      console.error("Drop operation failed:", error);
      showToast("Di chuyển thất bại: " + error.message, "error");
    }
  }

  handleDragEnd() {
    this.isDragging = false;
    this.draggedFiles = [];
    this.hideDropZones();

    // Remove all drag over classes
    document.querySelectorAll(".drag-over").forEach(el => {
      el.classList.remove("drag-over");
    });
  }

  showDropZones() {
    // Highlight all folders as potential drop zones
    document.querySelectorAll('[data-file-type="folder"]').forEach(folder => {
      folder.classList.add("drop-zone-active");
    });

    // Enable breadcrumb navigation as drop zones
    this.setupBreadcrumbDropZones();
  }

  hideDropZones() {
    document.querySelectorAll(".drop-zone-active").forEach(el => {
      el.classList.remove("drop-zone-active");
    });
    this.removeBreadcrumbDropZones();
  }

  setupBreadcrumbDropZones() {
    // Enable breadcrumb links as drop zones
    document.querySelectorAll(".breadcrumb-link").forEach(link => {
      link.classList.add("drop-zone-active");
      this.setupBreadcrumbDropEvents(link);
    });

    // Enable breadcrumb dropdown items as drop zones
    document.querySelectorAll(".breadcrumb-dropdown-item").forEach(item => {
      item.classList.add("drop-zone-active");
      this.setupBreadcrumbDropEvents(item);
    });
  }

  removeBreadcrumbDropZones() {
    // Remove drop zone classes from breadcrumb elements
    document
      .querySelectorAll(".breadcrumb-link, .breadcrumb-dropdown-item")
      .forEach(element => {
        element.classList.remove("drop-zone-active", "breadcrumb-drag-over");

        // Remove only our drag events, preserve existing navigation events
        if (element._fileOpsDragOver) {
          element.removeEventListener("dragover", element._fileOpsDragOver);
          delete element._fileOpsDragOver;
        }
        if (element._fileOpsDragLeave) {
          element.removeEventListener("dragleave", element._fileOpsDragLeave);
          delete element._fileOpsDragLeave;
        }
        if (element._fileOpsDrop) {
          element.removeEventListener("drop", element._fileOpsDrop);
          delete element._fileOpsDrop;
        }
      });
  }

  setupBreadcrumbDropEvents(element) {
    // Store references to event handlers for proper cleanup
    const dragOverHandler = e => {
      if (this.isDragging && this.draggedFiles.length > 0) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        element.classList.add("breadcrumb-drag-over");
      }
    };

    const dragLeaveHandler = e => {
      // Only remove highlight if we're actually leaving the element
      if (!element.contains(e.relatedTarget)) {
        element.classList.remove("breadcrumb-drag-over");
      }
    };

    const dropHandler = e => {
      e.preventDefault();
      e.stopPropagation();

      element.classList.remove("breadcrumb-drag-over");

      if (!this.isDragging || this.draggedFiles.length === 0) {
        return;
      }

      // Get target folder ID from breadcrumb
      const targetFolderId = this.getBreadcrumbFolderId(element);
      if (targetFolderId === null) {
        return; // Invalid target
      }

      // Check if dropping on current folder
      if (targetFolderId === fileManager.currentFolderId) {
        showToast("Không thể di chuyển vào thư mục hiện tại", "warning");
        return;
      }

      // Check if dropping folder into itself
      const droppingSelf = this.draggedFiles.some(
        file => file.id === targetFolderId
      );
      if (droppingSelf) {
        showToast("Không thể di chuyển thư mục vào chính nó", "warning");
        return;
      }

      this.handleBreadcrumbDrop(targetFolderId, element);
    };

    // Store references for cleanup
    element._fileOpsDragOver = dragOverHandler;
    element._fileOpsDragLeave = dragLeaveHandler;
    element._fileOpsDrop = dropHandler;

    // Add event listeners
    element.addEventListener("dragover", dragOverHandler);
    element.addEventListener("dragleave", dragLeaveHandler);
    element.addEventListener("drop", dropHandler);
  }

  getBreadcrumbFolderId(element) {
    if (element.classList.contains("breadcrumb-link")) {
      // Get breadcrumb index and convert to folder ID
      const breadcrumbIndex = parseInt(
        element.getAttribute("data-breadcrumb-index")
      );
      if (
        !isNaN(breadcrumbIndex) &&
        fileManager.breadcrumbs &&
        fileManager.breadcrumbs[breadcrumbIndex]
      ) {
        return fileManager.breadcrumbs[breadcrumbIndex].id;
      }
    } else if (element.classList.contains("breadcrumb-dropdown-item")) {
      // Get breadcrumb index from dropdown item
      const breadcrumbIndex = parseInt(
        element.getAttribute("data-breadcrumb-index")
      );
      if (
        !isNaN(breadcrumbIndex) &&
        fileManager.breadcrumbs &&
        fileManager.breadcrumbs[breadcrumbIndex]
      ) {
        return fileManager.breadcrumbs[breadcrumbIndex].id;
      }
    }
    return null;
  }

  async handleBreadcrumbDrop(targetFolderId, element) {
    try {
      // Get folder name for user feedback
      const breadcrumbIndex = parseInt(
        element.getAttribute("data-breadcrumb-index")
      );
      const folderName =
        fileManager.breadcrumbs && fileManager.breadcrumbs[breadcrumbIndex]
          ? fileManager.breadcrumbs[breadcrumbIndex].name
          : "thư mục";

      const fileIds = this.draggedFiles.map(f => f.id);
      const response = await this.moveFiles(fileIds, targetFolderId);

      showToast(
        `Đã di chuyển ${response.moved} mục vào "${folderName}"`,
        "success"
      );

      // Refresh current folder
      if (typeof fileManager !== "undefined") {
        await fileManager.renderFiles(fileManager.currentFolderId);
      }

      // Clear selection if using multiSelect
      if (typeof multiSelectManager !== "undefined") {
        multiSelectManager.clearSelection();
      }
    } catch (error) {
      console.error("Breadcrumb drop operation failed:", error);
      showToast("Di chuyển thất bại: " + error.message, "error");
    }
  }

  // API calls
  async moveFiles(fileIds, targetFolderId) {
    const response = await fetch("/api/move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileIds,
        targetFolderId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to move files");
    }

    return await response.json();
  }

  async copyFiles(fileIds, targetFolderId) {
    const response = await fetch("/api/copy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileIds,
        targetFolderId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to copy files");
    }

    return await response.json();
  }

  // Show folder tree dialog for selecting target folder
  async showFolderTreeDialog(operation = "move") {
    if (typeof folderTreeManager === "undefined") {
      showToast("Folder tree manager not available", "error");
      return;
    }

    const selectedFiles = this.getSelectedFiles();
    if (selectedFiles.length === 0) {
      showToast(
        "Vui lòng chọn file để " +
          (operation === "move" ? "di chuyển" : "sao chép"),
        "warning"
      );
      return;
    }

    try {
      const targetFolderId = await folderTreeManager.showDialog(operation);
      if (targetFolderId) {
        const fileIds = selectedFiles.map(f => f.id);

        if (operation === "move") {
          const response = await this.moveFiles(fileIds, targetFolderId);
          showToast(`Đã di chuyển ${response.moved} mục`, "success");
        } else {
          const response = await this.copyFiles(fileIds, targetFolderId);
          showToast(`Đã sao chép ${response.copied} mục`, "success");
        }

        // Refresh current folder
        if (typeof fileManager !== "undefined") {
          await fileManager.renderFiles(fileManager.currentFolderId);
        }

        // Clear selection
        if (typeof multiSelectManager !== "undefined") {
          multiSelectManager.clearSelection();
        }
      }
    } catch (error) {
      console.error("Folder tree operation failed:", error);
      showToast("Thao tác thất bại: " + error.message, "error");
    }
  }

  handleOperationRequest(e) {
    const { operation, files } = e.detail;

    if (operation === "move") {
      this.showFolderTreeDialog("move");
    } else if (operation === "copy") {
      this.showFolderTreeDialog("copy");
    }
  }

  handleBulkOperation(e) {
    const { operation } = e.detail;

    if (operation === "move") {
      this.showFolderTreeDialog("move");
    } else if (operation === "copy") {
      this.showFolderTreeDialog("copy");
    }
  }
}

// Create global instance
const fileOperationsManager = new FileOperationsManager();
