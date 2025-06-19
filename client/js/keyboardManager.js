// Keyboard Manager Module
class KeyboardManager {
  constructor() {
    this.shortcuts = new Map();
    this.isEnabled = true;
    
    this.init();
  }

  init() {
    this.setupDefaultShortcuts();
    this.setupEventListeners();
    console.log('⌨️ Keyboard Manager initialized');
  }

  setupDefaultShortcuts() {
    // File operations
    this.addShortcut('F2', () => this.handleRename());
    this.addShortcut('Delete', () => this.handleDelete());
    this.addShortcut('Ctrl+D', () => this.handleDownload());
    this.addShortcut('Ctrl+L', () => this.handleCopyLink());
    this.addShortcut('Space', () => this.handlePreview());
    
    // Navigation
    this.addShortcut('Escape', () => this.handleEscape());
    this.addShortcut('F5', () => this.handleRefresh());
    this.addShortcut('Ctrl+F', () => this.handleSearch());
    this.addShortcut('Ctrl+Shift+N', () => this.handleNewFolder());
    
    // View controls
    this.addShortcut('Ctrl+1', () => this.handleListView());
    this.addShortcut('Ctrl+2', () => this.handleGridView());
    this.addShortcut('Ctrl+Shift+T', () => this.handleToggleTheme());
    
    // Upload
    this.addShortcut('Ctrl+U', () => this.handleUploadFile());
    this.addShortcut('Ctrl+Shift+U', () => this.handleUploadFolder());
    
    // Selection
    this.addShortcut('Ctrl+A', () => this.handleSelectAll());
    this.addShortcut('Ctrl+Shift+A', () => this.handleDeselectAll());
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (!this.isEnabled) return;
      
      // Don't trigger shortcuts when typing in inputs
      if (this.isTypingInInput(e.target)) return;
      
      const shortcut = this.getShortcutString(e);
      const handler = this.shortcuts.get(shortcut);
      
      if (handler) {
        e.preventDefault();
        handler();
      }
    });
  }

  addShortcut(shortcut, handler) {
    this.shortcuts.set(shortcut, handler);
  }

  removeShortcut(shortcut) {
    this.shortcuts.delete(shortcut);
  }

  getShortcutString(event) {
    const parts = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    // Handle special keys
    const specialKeys = {
      ' ': 'Space',
      'Enter': 'Enter',
      'Escape': 'Escape',
      'Delete': 'Delete',
      'Backspace': 'Backspace',
      'Tab': 'Tab',
      'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
      'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
      'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12'
    };
    
    const key = specialKeys[event.key] || event.key.toUpperCase();
    parts.push(key);
    
    return parts.join('+');
  }

  isTypingInInput(element) {
    const inputTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
    return inputTypes.includes(element.tagName) || 
           element.contentEditable === 'true' ||
           element.closest('.search-box');
  }

  // Shortcut handlers
  handleRename() {
    const selectedFile = this.getSelectedFile();
    if (selectedFile && fileManager) {
      fileManager.renameFile(selectedFile.id, selectedFile.name);
    }
  }

  handleDelete() {
    const selectedFile = this.getSelectedFile();
    if (selectedFile && fileManager) {
      fileManager.deleteFile(selectedFile.id, selectedFile.isFolder);
    }
  }

  handleDownload() {
    const selectedFile = this.getSelectedFile();
    if (selectedFile) {
      window.open(`/api/download/${selectedFile.id}`, '_blank');
    }
  }

  handleCopyLink() {
    const selectedFile = this.getSelectedFile();
    if (selectedFile && selectedFile.webViewLink) {
      navigator.clipboard.writeText(selectedFile.webViewLink).then(() => {
        showToast('Đã sao chép liên kết!', 'success');
      }).catch(() => {
        showToast('Không thể sao chép liên kết!', 'error');
      });
    }
  }

  handlePreview() {
    const selectedFile = this.getSelectedFile();
    if (selectedFile && !selectedFile.isFolder && previewManager) {
      previewManager.previewFile(selectedFile, fileManager.currentFiles || []);
    }
  }

  handleEscape() {
    // Close any open modals/menus
    if (contextMenuManager && contextMenuManager.isMenuVisible()) {
      contextMenuManager.hideMenu();
    } else if (previewManager) {
      previewManager.closePreview();
    }
  }

  handleRefresh() {
    if (fileManager) {
      fileManager.renderFiles(fileManager.currentFolderId);
      showToast('Đã làm mới!', 'info');
    }
  }

  handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  handleNewFolder() {
    const createBtn = document.getElementById('createFolderBtn');
    if (createBtn) {
      createBtn.click();
    }
  }

  handleListView() {
    if (viewManager) {
      viewManager.setView('list', true);
    }
  }

  handleGridView() {
    if (viewManager) {
      viewManager.setView('grid', true);
    }
  }

  handleToggleTheme() {
    if (themeManager) {
      themeManager.toggleTheme();
    }
  }

  handleUploadFile() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.click();
    }
  }

  handleUploadFolder() {
    const folderInput = document.getElementById('folderInput');
    if (folderInput) {
      folderInput.click();
    }
  }

  handleSelectAll() {
    if (multiSelectManager) {
      multiSelectManager.selectAll();
    }
  }

  handleDeselectAll() {
    if (multiSelectManager) {
      multiSelectManager.deselectAll();
    }
  }

  // Helper methods
  getSelectedFile() {
    // Try to get from multi-select first
    if (multiSelectManager && multiSelectManager.selectedFiles.size > 0) {
      const firstSelected = Array.from(multiSelectManager.selectedFiles)[0];
      return fileManager.currentFiles?.find(f => f.id === firstSelected);
    }
    
    // Try to get from context menu
    if (contextMenuManager && contextMenuManager.getCurrentFile()) {
      return contextMenuManager.getCurrentFile();
    }
    
    // Try to get focused element
    const focusedRow = document.querySelector('tr:focus, .file-grid-item:focus');
    if (focusedRow) {
      const fileId = focusedRow.getAttribute('data-file-id');
      return fileManager.currentFiles?.find(f => f.id === fileId);
    }
    
    return null;
  }

  // Control methods
  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  isShortcutEnabled() {
    return this.isEnabled;
  }

  // Get all shortcuts for help display
  getAllShortcuts() {
    const shortcuts = [];
    for (const [key, handler] of this.shortcuts) {
      shortcuts.push({
        shortcut: key,
        description: this.getShortcutDescription(key)
      });
    }
    return shortcuts;
  }

  getShortcutDescription(shortcut) {
    const descriptions = {
      'F2': 'Đổi tên file/folder',
      'Delete': 'Xóa file/folder',
      'Ctrl+D': 'Tải xuống',
      'Ctrl+L': 'Sao chép liên kết',
      'Space': 'Xem trước',
      'Escape': 'Đóng modal/menu',
      'F5': 'Làm mới',
      'Ctrl+F': 'Tìm kiếm',
      'Ctrl+Shift+N': 'Tạo thư mục mới',
      'Ctrl+1': 'Chế độ danh sách',
      'Ctrl+2': 'Chế độ lưới',
      'Ctrl+Shift+T': 'Chuyển đổi theme',
      'Ctrl+U': 'Upload file',
      'Ctrl+Shift+U': 'Upload folder',
      'Ctrl+A': 'Chọn tất cả',
      'Ctrl+Shift+A': 'Bỏ chọn tất cả'
    };
    
    return descriptions[shortcut] || 'Không có mô tả';
  }
}

// Export instance
const keyboardManager = new KeyboardManager();

// Global access for debugging
window.keyboardManager = keyboardManager;
