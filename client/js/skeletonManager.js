// Skeleton Manager Module
class SkeletonManager {
  constructor() {
    this.isActive = false;
    this.currentSkeletons = new Set();
    
    this.init();
  }

  init() {
    console.log('💀 Skeleton Manager initialized');
  }

  // Show file list skeleton (table view)
  showFileListSkeleton(container, count = 8) {
    if (!container) return;
    
    const skeletonTable = document.createElement('table');
    skeletonTable.className = 'file-list skeleton-table';
    skeletonTable.id = 'skeleton-file-table';
    
    // Create table header
    skeletonTable.innerHTML = `
      <thead>
        <tr>
          <th class="col-name">Tên</th>
          <th class="col-time">Ngày cập nhật</th>
          <th class="col-size">Dung lượng</th>
          <th class="col-action">Tác vụ</th>
        </tr>
      </thead>
      <tbody>
        ${this.generateFileRowSkeletons(count)}
      </tbody>
    `;
    
    container.appendChild(skeletonTable);
    this.currentSkeletons.add('file-table');
    this.isActive = true;
  }

  // Show file grid skeleton (grid view)
  showFileGridSkeleton(container, count = 12) {
    if (!container) return;
    
    const skeletonGrid = document.createElement('div');
    skeletonGrid.className = 'skeleton-grid';
    skeletonGrid.id = 'skeleton-file-grid';
    
    skeletonGrid.innerHTML = this.generateGridItemSkeletons(count);
    
    container.appendChild(skeletonGrid);
    this.currentSkeletons.add('file-grid');
    this.isActive = true;
  }

  // Show search results skeleton
  showSearchSkeleton(container, count = 6) {
    if (!container) return;
    
    const skeletonContainer = document.createElement('div');
    skeletonContainer.className = 'skeleton-search-container';
    skeletonContainer.id = 'skeleton-search';
    
    skeletonContainer.innerHTML = `
      <div class="skeleton-search-header">
        <div class="skeleton skeleton-search-icon"></div>
        <div class="skeleton skeleton-search-text"></div>
      </div>
      <table class="file-list skeleton-table">
        <thead>
          <tr>
            <th class="col-name">Tên</th>
            <th class="col-time">Ngày cập nhật</th>
            <th class="col-size">Dung lượng</th>
            <th class="col-action">Tác vụ</th>
          </tr>
        </thead>
        <tbody>
          ${this.generateFileRowSkeletons(count)}
        </tbody>
      </table>
    `;
    
    container.appendChild(skeletonContainer);
    this.currentSkeletons.add('search');
    this.isActive = true;
  }

  // Show breadcrumb skeleton
  showBreadcrumbSkeleton(container) {
    if (!container) return;
    
    const skeletonBreadcrumb = document.createElement('div');
    skeletonBreadcrumb.className = 'skeleton-breadcrumb';
    skeletonBreadcrumb.id = 'skeleton-breadcrumb';
    
    skeletonBreadcrumb.innerHTML = `
      <div class="skeleton skeleton-breadcrumb-item home"></div>
      <div class="skeleton skeleton-breadcrumb-separator"></div>
      <div class="skeleton skeleton-breadcrumb-item folder"></div>
      <div class="skeleton skeleton-breadcrumb-separator"></div>
      <div class="skeleton skeleton-breadcrumb-item folder"></div>
    `;
    
    container.appendChild(skeletonBreadcrumb);
    this.currentSkeletons.add('breadcrumb');
    this.isActive = true;
  }

  // Show storage bar skeleton
  showStorageSkeleton(container) {
    if (!container) return;
    
    const skeletonStorage = document.createElement('div');
    skeletonStorage.className = 'skeleton skeleton-storage';
    skeletonStorage.id = 'skeleton-storage';
    
    container.appendChild(skeletonStorage);
    this.currentSkeletons.add('storage');
    this.isActive = true;
  }

  // Generate file row skeletons for table view
  generateFileRowSkeletons(count) {
    const rows = [];
    const nameVariants = ['short', 'medium', 'long'];
    
    for (let i = 0; i < count; i++) {
      const nameVariant = nameVariants[i % nameVariants.length];
      
      rows.push(`
        <tr class="skeleton-table-row">
          <td class="skeleton-table-cell col-name">
            <div class="skeleton skeleton-file-icon"></div>
            <div class="skeleton skeleton-file-name ${nameVariant}"></div>
          </td>
          <td class="skeleton-table-cell col-time">
            <div class="skeleton skeleton-file-date"></div>
          </td>
          <td class="skeleton-table-cell col-size">
            <div class="skeleton skeleton-file-size"></div>
          </td>
          <td class="skeleton-table-cell col-action">
            <div class="skeleton-file-actions">
              <div class="skeleton skeleton-action-btn"></div>
              <div class="skeleton skeleton-action-btn"></div>
              <div class="skeleton skeleton-action-btn"></div>
            </div>
          </td>
        </tr>
      `);
    }
    
    return rows.join('');
  }

  // Generate grid item skeletons for grid view
  generateGridItemSkeletons(count) {
    const items = [];
    
    for (let i = 0; i < count; i++) {
      items.push(`
        <div class="skeleton-grid-item">
          <div class="skeleton skeleton-grid-icon"></div>
          <div class="skeleton skeleton-grid-name"></div>
          <div class="skeleton skeleton-grid-meta"></div>
        </div>
      `);
    }
    
    return items.join('');
  }

  // Hide specific skeleton
  hideSkeleton(type) {
    const skeletonElement = document.getElementById(`skeleton-${type}`);
    if (skeletonElement) {
      skeletonElement.remove();
      this.currentSkeletons.delete(type);
    }
    
    if (this.currentSkeletons.size === 0) {
      this.isActive = false;
    }
  }

  // Hide all skeletons
  hideAllSkeletons() {
    this.currentSkeletons.forEach(type => {
      const skeletonElement = document.getElementById(`skeleton-${type}`);
      if (skeletonElement) {
        skeletonElement.remove();
      }
    });
    
    this.currentSkeletons.clear();
    this.isActive = false;
  }

  // Show skeleton based on current view
  showFileListSkeletonForCurrentView(container, count = 8) {
    if (!container) return;
    
    // Check current view mode
    const isGridView = typeof viewManager !== 'undefined' && 
                      viewManager && 
                      viewManager.isGridView && 
                      viewManager.isGridView();
    
    if (isGridView) {
      this.showFileGridSkeleton(container, count);
    } else {
      this.showFileListSkeleton(container, count);
    }
  }

  // Utility methods
  isSkeletonActive() {
    return this.isActive;
  }

  getActiveSkeletons() {
    return Array.from(this.currentSkeletons);
  }

  // Method to show skeleton with delay (for better UX)
  showSkeletonWithDelay(type, container, delay = 200, ...args) {
    setTimeout(() => {
      switch (type) {
        case 'file-list':
          this.showFileListSkeletonForCurrentView(container, ...args);
          break;
        case 'search':
          this.showSearchSkeleton(container, ...args);
          break;
        case 'breadcrumb':
          this.showBreadcrumbSkeleton(container, ...args);
          break;
        case 'storage':
          this.showStorageSkeleton(container, ...args);
          break;
      }
    }, delay);
  }

  // Method to hide skeleton with fade out
  hideSkeletonWithFade(type, duration = 300) {
    const skeletonElement = document.getElementById(`skeleton-${type}`);
    if (skeletonElement) {
      skeletonElement.style.transition = `opacity ${duration}ms ease`;
      skeletonElement.style.opacity = '0';
      
      setTimeout(() => {
        this.hideSkeleton(type);
      }, duration);
    }
  }
}

// Export instance
const skeletonManager = new SkeletonManager();

// Global access for debugging
window.skeletonManager = skeletonManager;
