// Lazy Loading Manager for Mini Google Drive v2.3.0
class LazyLoadManager {
  constructor() {
    this.observer = null;
    this.loadedImages = new Set();
    this.loadingImages = new Set();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000;

    this.init();
  }

  init() {
    // Create intersection observer for lazy loading
    if ("IntersectionObserver" in window) {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          root: null,
          rootMargin: "50px",
          threshold: 0.1,
        }
      );

      console.log("✅ Lazy Loading Manager initialized");
    } else {
      console.warn(
        "⚠️ IntersectionObserver not supported, loading all images immediately"
      );
      this.fallbackLoadAll();
    }
  }

  // Handle intersection observer entries
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        this.loadImage(img);
        this.observer.unobserve(img);
      }
    });
  }

  // Setup lazy loading for an image element
  setupLazyLoad(img, thumbnailUrl, fallbackIcon = "mdi-file") {
    if (!img || !thumbnailUrl) return;

    // Skip if already loaded
    if (this.loadedImages.has(img)) return;

    // Set placeholder
    this.setPlaceholder(img, fallbackIcon);

    // Store thumbnail URL as data attribute
    img.dataset.thumbnailUrl = thumbnailUrl;
    img.dataset.fallbackIcon = fallbackIcon;

    // Add loading class
    img.classList.add("lazy-loading");

    // Observe the image
    if (this.observer) {
      this.observer.observe(img);
    } else {
      // Fallback: load immediately
      this.loadImage(img);
    }
  }

  // Load image with retry logic (CSP-safe version)
  async loadImage(img) {
    const thumbnailUrl = img.dataset.thumbnailUrl;
    const fallbackIcon = img.dataset.fallbackIcon || "mdi-file";

    if (
      !thumbnailUrl ||
      this.loadedImages.has(img) ||
      this.loadingImages.has(img)
    ) {
      return;
    }

    this.loadingImages.add(img);

    try {
      // Show loading state
      img.classList.add("loading");

      // Direct image loading (CSP-safe approach)
      await this.loadImageDirect(img, thumbnailUrl);

      img.classList.remove("lazy-loading", "loading");
      img.classList.add("loaded");

      // Mark as loaded
      this.loadedImages.add(img);
      this.loadingImages.delete(img);

      // Clean up data attributes
      delete img.dataset.thumbnailUrl;
      delete img.dataset.fallbackIcon;
    } catch (error) {
      console.warn("Failed to load thumbnail:", thumbnailUrl, error);

      // Retry logic
      const retryCount = this.retryAttempts.get(img) || 0;
      if (retryCount < this.maxRetries) {
        this.retryAttempts.set(img, retryCount + 1);

        setTimeout(() => {
          this.loadingImages.delete(img);
          this.loadImage(img);
        }, this.retryDelay * (retryCount + 1));
      } else {
        // Final fallback to icon
        this.setFallbackIcon(img, fallbackIcon);
        this.loadingImages.delete(img);
        this.loadedImages.add(img);
      }
    }
  }

  // CSP-safe direct image loading
  async loadImageDirect(img, url) {
    return new Promise((resolve, reject) => {
      const tempImg = new Image();

      tempImg.onload = () => {
        // Set the source directly (CSP-safe)
        img.src = url;
        resolve();
      };

      tempImg.onerror = error => {
        reject(new Error(`Failed to load image: ${url}`));
      };

      // Start loading the image
      tempImg.src = url;
    });
  }

  // Preload image with fetch
  async preloadImage(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.blob();
  }

  // Set placeholder while loading
  setPlaceholder(img, fallbackIcon) {
    img.classList.add("thumbnail-placeholder");

    // Create placeholder with icon
    const placeholderSvg = this.createPlaceholderSvg(fallbackIcon);
    img.src = `data:image/svg+xml;base64,${btoa(placeholderSvg)}`;
  }

  // Set fallback icon when image fails
  setFallbackIcon(img, fallbackIcon) {
    img.classList.remove("lazy-loading", "loading");
    img.classList.add("thumbnail-fallback");

    const iconSvg = this.createIconSvg(fallbackIcon);
    img.src = `data:image/svg+xml;base64,${btoa(iconSvg)}`;
  }

  // Create placeholder SVG
  createPlaceholderSvg(icon) {
    return `
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" fill="#f0f0f0"/>
        <circle cx="32" cy="32" r="8" fill="#ccc">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      </svg>
    `;
  }

  // Create icon SVG for fallback
  createIconSvg(iconClass) {
    const iconMap = {
      "mdi-file":
        "M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z",
      "mdi-folder":
        "M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z",
      "mdi-image":
        "M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z",
      "mdi-video":
        "M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z",
      "mdi-music":
        "M12,3V13.55C11.41,13.21 10.73,13 10,13A3,3 0 0,0 7,16A3,3 0 0,0 10,19A3,3 0 0,0 13,16V7H18V5H12Z",
    };

    const path = iconMap[iconClass] || iconMap["mdi-file"];

    return `
      <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" fill="#f8f9fa"/>
        <path d="${path}" fill="#6c757d"/>
      </svg>
    `;
  }

  // Setup lazy loading for file grid
  setupFileGridLazyLoad() {
    const fileItems = document.querySelectorAll(
      ".file-item img, .file-card img"
    );

    fileItems.forEach(img => {
      const fileItem = img.closest(".file-item, .file-card");
      if (!fileItem) return;

      const fileType = fileItem.dataset.fileType;
      const thumbnailUrl =
        img.dataset.src || img.getAttribute("data-thumbnail");

      if (thumbnailUrl) {
        const fallbackIcon = this.getIconForFileType(fileType);
        this.setupLazyLoad(img, thumbnailUrl, fallbackIcon);
      }
    });
  }

  // Get appropriate icon for file type
  getIconForFileType(mimeType) {
    if (!mimeType) return "mdi-file";

    if (mimeType.includes("folder")) return "mdi-folder";
    if (mimeType.startsWith("image/")) return "mdi-image";
    if (mimeType.startsWith("video/")) return "mdi-video";
    if (mimeType.startsWith("audio/")) return "mdi-music";

    return "mdi-file";
  }

  // Batch setup for multiple images
  setupBatchLazyLoad(container) {
    if (!container) return;

    const images = container.querySelectorAll(
      "img[data-src], img[data-thumbnail]"
    );

    images.forEach(img => {
      const thumbnailUrl = img.dataset.src || img.dataset.thumbnail;
      const fileType = img.closest("[data-file-type]")?.dataset.fileType;
      const fallbackIcon = this.getIconForFileType(fileType);

      if (thumbnailUrl) {
        this.setupLazyLoad(img, thumbnailUrl, fallbackIcon);
      }
    });
  }

  // Preload critical images (above the fold)
  preloadCriticalImages() {
    const criticalImages = document.querySelectorAll(
      ".file-item:nth-child(-n+6) img, .file-card:nth-child(-n+6) img"
    );

    criticalImages.forEach(img => {
      const thumbnailUrl = img.dataset.src || img.dataset.thumbnail;
      if (thumbnailUrl) {
        this.loadImage(img);
      }
    });
  }

  // Fallback for browsers without IntersectionObserver
  fallbackLoadAll() {
    const lazyImages = document.querySelectorAll(
      "img[data-src], img[data-thumbnail]"
    );

    lazyImages.forEach(img => {
      const thumbnailUrl = img.dataset.src || img.dataset.thumbnail;
      if (thumbnailUrl) {
        this.loadImage(img);
      }
    });
  }

  // Clear observer and cleanup
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.loadedImages.clear();
    this.loadingImages.clear();
    this.retryAttempts.clear();
  }

  // Get loading stats
  getStats() {
    return {
      loaded: this.loadedImages.size,
      loading: this.loadingImages.size,
      retries: this.retryAttempts.size,
    };
  }
}

// Create global instance
const lazyLoadManager = new LazyLoadManager();

// Auto-setup when DOM content loads
document.addEventListener("DOMContentLoaded", () => {
  // Setup initial lazy loading
  lazyLoadManager.setupFileGridLazyLoad();

  // Preload critical images
  lazyLoadManager.preloadCriticalImages();
});

// Re-setup lazy loading when new content is added
document.addEventListener("filesLoaded", () => {
  setTimeout(() => {
    lazyLoadManager.setupFileGridLazyLoad();
  }, 100);
});

console.log("🚀 Lazy Loading Manager v2.3.0 loaded");
