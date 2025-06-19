// Theme Manager Module
class ThemeManager {
  constructor() {
    this.currentTheme = "light";
    this.themeToggle = null;
    this.themeIcon = null;
    this.storageKey = "mini-drive-theme";

    this.init();
  }

  init() {
    this.themeToggle = document.getElementById("themeToggle");
    this.themeIcon = document.getElementById("themeIcon");

    if (!this.themeToggle || !this.themeIcon) {
      console.warn("Theme toggle elements not found");
      return;
    }

    // Load saved theme or detect system preference
    this.loadTheme();

    // Setup event listeners
    this.setupEventListeners();

    // Listen for system theme changes
    this.setupSystemThemeListener();

    console.log("🎨 Theme Manager initialized");
  }

  setupEventListeners() {
    if (this.themeToggle) {
      this.themeToggle.addEventListener("click", () => {
        this.toggleTheme();
      });
    }
  }

  setupSystemThemeListener() {
    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", e => {
        // Only auto-switch if user hasn't manually set a preference
        const savedTheme = localStorage.getItem(this.storageKey);
        if (!savedTheme) {
          this.setTheme(e.matches ? "dark" : "light", false);
        }
      });
    }
  }

  loadTheme() {
    // Try to load from localStorage first
    const savedTheme = localStorage.getItem(this.storageKey);

    if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
      this.setTheme(savedTheme, false);
    } else {
      // Detect system preference
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      this.setTheme(prefersDark ? "dark" : "light", false);
    }
  }

  toggleTheme() {
    const newTheme = this.currentTheme === "light" ? "dark" : "light";
    this.setTheme(newTheme, true);

    // Add switching animation
    if (this.themeToggle) {
      this.themeToggle.classList.add("switching");
      setTimeout(() => {
        this.themeToggle.classList.remove("switching");
      }, 300);
    }

    // Show toast notification
    // const themeText = newTheme === 'dark' ? 'tối' : 'sáng';
    // showToast(`Đã chuyển sang chế độ ${themeText}`, 'info');
  }

  setTheme(theme, saveToStorage = true) {
    if (theme !== "light" && theme !== "dark") {
      console.warn("Invalid theme:", theme);
      return;
    }

    this.currentTheme = theme;

    // Apply theme to document
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    // Update icon
    this.updateIcon();

    // Save to localStorage if requested
    if (saveToStorage) {
      localStorage.setItem(this.storageKey, theme);
    }

    // Dispatch custom event for other components
    window.dispatchEvent(
      new CustomEvent("themeChanged", {
        detail: { theme: theme },
      })
    );

    console.log(`🎨 Theme set to: ${theme}`);
  }

  updateIcon() {
    if (!this.themeIcon) return;

    // Update icon based on current theme
    if (this.currentTheme === "dark") {
      // Show sun icon when in dark mode (to switch to light)
      this.themeIcon.className = "mdi mdi-weather-sunny";
      this.themeToggle.title = "Chuyển sang chế độ sáng";
    } else {
      // Show moon icon when in light mode (to switch to dark)
      this.themeIcon.className = "mdi mdi-weather-night";
      this.themeToggle.title = "Chuyển sang chế độ tối";
    }
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  isDarkMode() {
    return this.currentTheme === "dark";
  }

  isLightMode() {
    return this.currentTheme === "light";
  }

  // Method to force a specific theme (for testing or external control)
  forceTheme(theme) {
    this.setTheme(theme, true);
  }

  // Method to reset to system preference
  resetToSystemPreference() {
    localStorage.removeItem(this.storageKey);
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    this.setTheme(prefersDark ? "dark" : "light", false);
    showToast("Đã đặt lại theo cài đặt hệ thống", "info");
  }
}

// Export instance
const themeManager = new ThemeManager();

// Global access for debugging
window.themeManager = themeManager;
