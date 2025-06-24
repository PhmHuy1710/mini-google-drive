// Sort Manager Module
class SortManager {
  constructor() {
    this.currentSort = {
      field: "name", // name, modifiedTime, size
      direction: "asc", // asc, desc
    };
    this.setupSortControls();
  }

  setupSortControls() {
    // Add sort controls to toolbar
    const toolbar = document.querySelector(".toolbar");
    if (!toolbar) {
      console.warn("SortManager: No toolbar found");
      return;
    }

    const sortContainer = document.createElement("div");
    sortContainer.className = "sort-container";
    sortContainer.innerHTML = `
      <div class="sort-dropdown">
        <button class="btn-sort" id="sortToggle">
          <span class="mdi mdi-sort" id="sortIcon"></span>
          <span id="sortLabel">Sắp xếp</span>
        </button>
        <div class="sort-menu" id="sortMenu">
          <div class="sort-option" data-field="name" data-direction="asc">
            <span class="mdi mdi-sort-alphabetical-ascending"></span>
            <span>Tên A-Z</span>
            <span class="mdi mdi-check sort-check"></span>
          </div>
          <div class="sort-option" data-field="name" data-direction="desc">
            <span class="mdi mdi-sort-alphabetical-descending"></span>
            <span>Tên Z-A</span>
            <span class="mdi mdi-check sort-check"></span>
          </div>
          <div class="sort-option" data-field="modifiedTime" data-direction="desc">
            <span class="mdi mdi-sort-clock-descending"></span>
            <span>Mới nhất</span>
            <span class="mdi mdi-check sort-check"></span>
          </div>
          <div class="sort-option" data-field="modifiedTime" data-direction="asc">
            <span class="mdi mdi-sort-clock-ascending"></span>
            <span>Cũ nhất</span>
            <span class="mdi mdi-check sort-check"></span>
          </div>
          <div class="sort-option" data-field="size" data-direction="desc">
            <span class="mdi mdi-sort-numeric-descending"></span>
            <span>Lớn nhất</span>
            <span class="mdi mdi-check sort-check"></span>
          </div>
          <div class="sort-option" data-field="size" data-direction="asc">
            <span class="mdi mdi-sort-numeric-ascending"></span>
            <span>Nhỏ nhất</span>
            <span class="mdi mdi-check sort-check"></span>
          </div>
          <div class="sort-divider"></div>
          <div class="sort-option sort-reset" data-reset="true">
            <span class="mdi mdi-refresh"></span>
            <span>Mặc định</span>
          </div>
        </div>
      </div>
    `;

    // Smart positioning based on page type and available elements
    let inserted = false;

    // Try to insert after search container (main page)
    const searchContainer = toolbar.querySelector(".search-container");
    if (searchContainer && searchContainer.parentNode) {
      searchContainer.parentNode.insertBefore(
        sortContainer,
        searchContainer.nextSibling
      );
      inserted = true;
    }

    // Try to insert after create folder button (main page fallback)
    if (!inserted) {
      const createBtn = toolbar.querySelector(".btn-create");
      if (createBtn && createBtn.parentNode) {
        createBtn.parentNode.insertBefore(sortContainer, createBtn.nextSibling);
        inserted = true;
      }
    }

    // Try to insert after refresh button (recycle-bin page)
    if (!inserted) {
      const refreshBtn = toolbar.querySelector(".btn-refresh");
      if (refreshBtn && refreshBtn.parentNode) {
        refreshBtn.parentNode.insertBefore(
          sortContainer,
          refreshBtn.nextSibling
        );
        inserted = true;
      }
    }

    // Last resort: append to toolbar
    if (!inserted) {
      toolbar.appendChild(sortContainer);
    }

    this.setupSortEvents();
    this.updateSortLabel();
  }

  setupSortEvents() {
    const sortToggle = document.getElementById("sortToggle");
    const sortMenu = document.getElementById("sortMenu");

    // Toggle sort menu
    sortToggle.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      sortMenu.classList.toggle("show");
    });

    // Close menu when clicking outside
    document.addEventListener("click", e => {
      if (!e.target.closest(".sort-dropdown")) {
        sortMenu.classList.remove("show");
      }
    });

    // Handle sort option clicks
    sortMenu.addEventListener("click", e => {
      const option = e.target.closest(".sort-option");
      if (!option) return;

      if (option.dataset.reset) {
        this.resetSort();
      } else {
        const field = option.dataset.field;
        const direction = option.dataset.direction;
        this.changeSort(field, direction);
      }

      sortMenu.classList.remove("show");
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", e => {
      // Ctrl + Shift + S: Toggle sort menu
      if (e.ctrlKey && e.shiftKey && e.key === "S") {
        e.preventDefault();
        sortToggle.click();
      }
    });
  }

  changeSort(field, direction) {
    this.currentSort = { field, direction };
    this.updateSortLabel();
    this.updateSortChecks();
    this.applySorting();

    // Store in localStorage
    localStorage.setItem(
      "miniGoogleDriveSort",
      JSON.stringify(this.currentSort)
    );

    showToast(`Đã sắp xếp theo ${this.getSortDisplayName()}`, "success");
  }

  resetSort() {
    this.currentSort = { field: "name", direction: "asc" };
    this.updateSortLabel();
    this.updateSortChecks();
    this.applySorting();

    // Remove from localStorage
    localStorage.removeItem("miniGoogleDriveSort");

    showToast("Đã đặt lại sắp xếp mặc định", "success");
  }

  updateSortLabel() {
    const sortLabel = document.getElementById("sortLabel");
    const sortIcon = document.getElementById("sortIcon");

    if (sortLabel && sortIcon) {
      const displayName = this.getSortDisplayName();
      sortLabel.textContent = displayName;

      // Update icon based on sort type
      const iconMap = {
        "name-asc": "mdi-sort-alphabetical-ascending",
        "name-desc": "mdi-sort-alphabetical-descending",
        "modifiedTime-asc": "mdi-sort-clock-ascending",
        "modifiedTime-desc": "mdi-sort-clock-descending",
        "size-asc": "mdi-sort-numeric-ascending",
        "size-desc": "mdi-sort-numeric-descending",
      };

      const iconKey = `${this.currentSort.field}-${this.currentSort.direction}`;
      const iconClass = iconMap[iconKey] || "mdi-sort";

      sortIcon.className = `mdi ${iconClass}`;
    }
  }

  updateSortChecks() {
    const options = document.querySelectorAll(".sort-option");
    options.forEach(option => {
      const check = option.querySelector(".sort-check");
      if (check) {
        const isActive =
          option.dataset.field === this.currentSort.field &&
          option.dataset.direction === this.currentSort.direction;
        check.style.display = isActive ? "block" : "none";
      }
    });
  }

  getSortDisplayName() {
    const names = {
      "name-asc": "Tên A-Z",
      "name-desc": "Tên Z-A",
      "modifiedTime-asc": "Cũ nhất",
      "modifiedTime-desc": "Mới nhất",
      "size-asc": "Nhỏ nhất",
      "size-desc": "Lớn nhất",
    };

    const key = `${this.currentSort.field}-${this.currentSort.direction}`;
    return names[key] || "Sắp xếp";
  }

  applySorting() {
    try {
      // Trigger re-render with new sorting
      if (searchManager && searchManager.isSearchMode) {
        // Re-render search results with new sorting
        searchManager.renderSearchResults(
          searchManager.lastSearchResults,
          searchManager.searchTerm
        );
      } else if (fileManager) {
        // Re-render current folder with new sorting - handle async properly
        fileManager.renderFiles(fileManager.currentFolderId).catch(error => {
          console.error("Error applying sort to file list:", error);
        });
      }
    } catch (error) {
      console.error("Error in applySorting:", error);
    }
  }

  sortFiles(files) {
    const sorted = [...files];

    sorted.sort((a, b) => {
      // Always put folders first, regardless of sort
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      let comparison = 0;

      switch (this.currentSort.field) {
        case "name":
          comparison = a.name.localeCompare(b.name, "vi", {
            sensitivity: "base",
          });
          break;

        case "modifiedTime":
          const timeA = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
          const timeB = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
          comparison = timeA - timeB;
          break;

        case "size":
          const sizeA = a.size || 0;
          const sizeB = b.size || 0;
          comparison = sizeA - sizeB;
          break;
      }

      return this.currentSort.direction === "desc" ? -comparison : comparison;
    });

    return sorted;
  }

  // Load sort preference from localStorage
  loadSortPreference() {
    try {
      const saved = localStorage.getItem("miniGoogleDriveSort");
      if (saved) {
        this.currentSort = JSON.parse(saved);
        this.updateSortLabel();
        this.updateSortChecks();
      }
    } catch (error) {
      console.error("Error loading sort preference:", error);
    }
  }

  // Get current sort state (for pagination integration)
  getCurrentSort() {
    return {
      column: this.currentSort.field,
      direction: this.currentSort.direction,
    };
  }

  // Get raw sort state
  getSortState() {
    return { ...this.currentSort };
  }

  // Quick sort methods
  sortByName(ascending = true) {
    this.changeSort("name", ascending ? "asc" : "desc");
  }

  sortByDate(newest = true) {
    this.changeSort("modifiedTime", newest ? "desc" : "asc");
  }

  sortBySize(largest = true) {
    this.changeSort("size", largest ? "desc" : "asc");
  }
}

// Export instance
const sortManager = new SortManager();
