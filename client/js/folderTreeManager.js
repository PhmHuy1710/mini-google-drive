class FolderTreeManager {
  constructor() {
    this.folderTree = [];
    this.selectedFolderId = null;
    this.expandedFolders = new Set();
    this.currentOperation = null;
    this.resolvePromise = null;
    this.init();
  }

  init() {
    this.createDialog();
    console.log("🌳 Folder Tree Manager initialized");
  }

  createDialog() {
    this.dialog = document.createElement("div");
    this.dialog.className = "folder-tree-dialog";
    this.dialog.innerHTML = `
      <div class="folder-tree-overlay"></div>
      <div class="folder-tree-content">
        <div class="folder-tree-header">
          <h3 class="folder-tree-title">Chọn thư mục đích</h3>
          <button class="folder-tree-close" type="button">
            <span class="mdi mdi-close"></span>
          </button>
        </div>
        
        <div class="folder-tree-body">
          <div class="folder-tree-loading">
            <span class="mdi mdi-loading mdi-spin"></span>
            <span>Đang tải cây thư mục...</span>
          </div>
          <div class="folder-tree-container" style="display: none;">
            <div class="folder-tree-root">
              <div class="folder-tree-item root-folder" data-folder-id="root">
                <span class="folder-toggle">
                  <span class="mdi mdi-chevron-down"></span>
                </span>
                <span class="folder-icon">
                  <span class="mdi mdi-folder-home"></span>
                </span>
                <span class="folder-name">📁 Thư mục gốc</span>
              </div>
              <div class="folder-tree-children"></div>
            </div>
          </div>
          <div class="folder-tree-error" style="display: none;">
            <span class="mdi mdi-alert-circle"></span>
            <span>Không thể tải cây thư mục</span>
          </div>
        </div>
        
        <div class="folder-tree-footer">
          <button class="btn btn-secondary folder-tree-cancel">Hủy</button>
          <button class="btn btn-primary folder-tree-confirm" disabled>
            <span class="folder-tree-action-text">Di chuyển</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.dialog);
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Close dialog
    const closeBtn = this.dialog.querySelector(".folder-tree-close");
    const cancelBtn = this.dialog.querySelector(".folder-tree-cancel");
    const overlay = this.dialog.querySelector(".folder-tree-overlay");

    closeBtn.addEventListener("click", () => this.closeDialog());
    cancelBtn.addEventListener("click", () => this.closeDialog());
    overlay.addEventListener("click", () => this.closeDialog());

    // Confirm selection
    const confirmBtn = this.dialog.querySelector(".folder-tree-confirm");
    confirmBtn.addEventListener("click", () => this.confirmSelection());

    // Handle folder clicks and toggles
    this.dialog.addEventListener("click", e => {
      if (e.target.closest(".folder-toggle")) {
        const folderItem = e.target.closest(".folder-tree-item");
        this.toggleFolder(folderItem);
      } else if (e.target.closest(".folder-tree-item")) {
        const folderItem = e.target.closest(".folder-tree-item");
        this.selectFolder(folderItem);
      }
    });

    // Keyboard navigation
    this.dialog.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        this.closeDialog();
      } else if (e.key === "Enter") {
        if (this.selectedFolderId) {
          this.confirmSelection();
        }
      }
    });
  }

  async showDialog(operation = "move") {
    this.currentOperation = operation;

    // Update dialog text based on operation
    const title = this.dialog.querySelector(".folder-tree-title");
    const actionText = this.dialog.querySelector(".folder-tree-action-text");

    if (operation === "move") {
      title.textContent = "Chọn thư mục để di chuyển";
      actionText.textContent = "Di chuyển";
    } else {
      title.textContent = "Chọn thư mục để sao chép";
      actionText.textContent = "Sao chép";
    }

    // Show dialog
    this.dialog.classList.add("show");
    document.body.classList.add("folder-tree-open");

    // Load folder tree
    await this.loadFolderTree();

    // Return promise that resolves when user selects folder
    return new Promise(resolve => {
      this.resolvePromise = resolve;
    });
  }

  closeDialog() {
    this.dialog.classList.remove("show");
    document.body.classList.remove("folder-tree-open");

    if (this.resolvePromise) {
      this.resolvePromise(null); // Cancelled
      this.resolvePromise = null;
    }

    this.selectedFolderId = null;
    this.currentOperation = null;
  }

  confirmSelection() {
    if (this.selectedFolderId && this.resolvePromise) {
      this.resolvePromise(this.selectedFolderId);
      this.resolvePromise = null;
    }

    this.closeDialog();
  }

  async loadFolderTree() {
    const loading = this.dialog.querySelector(".folder-tree-loading");
    const container = this.dialog.querySelector(".folder-tree-container");
    const error = this.dialog.querySelector(".folder-tree-error");

    loading.style.display = "flex";
    container.style.display = "none";
    error.style.display = "none";

    try {
      const response = await fetch("/api/folder-tree");
      if (!response.ok) {
        throw new Error("Failed to load folder tree");
      }

      this.folderTree = await response.json();
      this.renderFolderTree();

      loading.style.display = "none";
      container.style.display = "block";

      // Auto-expand root folder
      const rootFolder = this.dialog.querySelector(".root-folder");
      if (rootFolder) {
        this.expandFolder(rootFolder);
      }
    } catch (err) {
      console.error("Error loading folder tree:", err);
      loading.style.display = "none";
      error.style.display = "flex";
    }
  }

  renderFolderTree() {
    const container = this.dialog.querySelector(".folder-tree-children");
    container.innerHTML = "";

    if (this.folderTree.length === 0) {
      container.innerHTML = `
        <div class="folder-tree-empty">
          <span class="mdi mdi-folder-outline"></span>
          <span>Không có thư mục con</span>
        </div>
      `;
      return;
    }

    this.folderTree.forEach(folder => {
      const folderElement = this.createFolderElement(folder);
      container.appendChild(folderElement);
    });
  }

  createFolderElement(folder, level = 0) {
    const div = document.createElement("div");
    div.className = "folder-tree-item";
    div.dataset.folderId = folder.id;
    div.dataset.level = level;

    const hasChildren = folder.children && folder.children.length > 0;
    const indentPx = level * 20;

    div.innerHTML = `
      <div class="folder-tree-content" style="padding-left: ${indentPx}px;">
        <span class="folder-toggle ${hasChildren ? "has-children" : ""}">
          ${hasChildren ? '<span class="mdi mdi-chevron-right"></span>' : ""}
        </span>
        <span class="folder-icon">
          <span class="mdi mdi-folder"></span>
        </span>
        <span class="folder-name">${this.escapeHtml(folder.name)}</span>
      </div>
    `;

    // Add children container
    if (hasChildren) {
      const childrenContainer = document.createElement("div");
      childrenContainer.className = "folder-tree-children collapsed";

      folder.children.forEach(child => {
        const childElement = this.createFolderElement(child, level + 1);
        childrenContainer.appendChild(childElement);
      });

      div.appendChild(childrenContainer);
    }

    return div;
  }

  toggleFolder(folderItem) {
    const folderId = folderItem.dataset.folderId;
    const toggle = folderItem.querySelector(".folder-toggle");
    const children = folderItem.querySelector(".folder-tree-children");

    if (!children) return;

    const isExpanded = !children.classList.contains("collapsed");

    if (isExpanded) {
      this.collapseFolder(folderItem);
    } else {
      this.expandFolder(folderItem);
    }
  }

  expandFolder(folderItem) {
    const folderId = folderItem.dataset.folderId;
    const toggle = folderItem.querySelector(".folder-toggle .mdi");
    const children = folderItem.querySelector(".folder-tree-children");

    if (children) {
      children.classList.remove("collapsed");
      if (toggle) {
        toggle.classList.remove("mdi-chevron-right");
        toggle.classList.add("mdi-chevron-down");
      }
      this.expandedFolders.add(folderId);
    }
  }

  collapseFolder(folderItem) {
    const folderId = folderItem.dataset.folderId;
    const toggle = folderItem.querySelector(".folder-toggle .mdi");
    const children = folderItem.querySelector(".folder-tree-children");

    if (children) {
      children.classList.add("collapsed");
      if (toggle) {
        toggle.classList.remove("mdi-chevron-down");
        toggle.classList.add("mdi-chevron-right");
      }
      this.expandedFolders.delete(folderId);
    }
  }

  selectFolder(folderItem) {
    // Remove previous selection
    this.dialog.querySelectorAll(".folder-tree-item.selected").forEach(item => {
      item.classList.remove("selected");
    });

    // Add selection to clicked folder
    folderItem.classList.add("selected");
    this.selectedFolderId = folderItem.dataset.folderId;

    // Enable confirm button
    const confirmBtn = this.dialog.querySelector(".folder-tree-confirm");
    confirmBtn.disabled = false;

    // Update button text with folder name
    const folderName = folderItem.querySelector(".folder-name").textContent;
    const actionText = this.dialog.querySelector(".folder-tree-action-text");
    const operation =
      this.currentOperation === "move" ? "Di chuyển đến" : "Sao chép đến";
    actionText.textContent = `${operation}: ${folderName}`;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Static method to get current folder tree (for external use)
  static async getFolderTree() {
    try {
      const response = await fetch("/api/folder-tree");
      if (!response.ok) {
        throw new Error("Failed to load folder tree");
      }
      return await response.json();
    } catch (error) {
      console.error("Error loading folder tree:", error);
      throw error;
    }
  }
}

// Create global instance
const folderTreeManager = new FolderTreeManager();
