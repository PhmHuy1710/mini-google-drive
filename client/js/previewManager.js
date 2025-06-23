// File Preview Manager Module
class PreviewManager {
  constructor() {
    this.currentFile = null;
    this.setupModal();
  }

  setupModal() {
    // Create preview modal if it doesn't exist
    if (!document.getElementById("previewModal")) {
      const modal = document.createElement("div");
      modal.className = "modal-bg preview-modal";
      modal.id = "previewModal";
      modal.style.display = "none"; // Ensure it's hidden initially
      modal.innerHTML = `
        <div class="preview-modal-content">
          <div class="preview-header">
            <h3 class="preview-title" id="previewTitle">File Preview</h3>
            <div class="preview-actions">
              <button class="btn-preview-action" id="downloadFromPreview" title="Tải về">
                <span class="mdi mdi-download"></span>
              </button>
              <button class="btn-preview-action" id="shareFromPreview" title="Chia sẻ">
                <span class="mdi mdi-share-variant"></span>
              </button>
              <button class="btn-preview-close" id="closePreview" title="Đóng">
                <span class="mdi mdi-close"></span>
              </button>
            </div>
          </div>
          <div class="preview-body" id="previewBody">
            <div class="preview-loading">
              <span class="mdi mdi-loading mdi-spin"></span>
              <span>Đang tải...</span>
            </div>
          </div>
          <div class="preview-footer">
            <div class="preview-info" id="previewInfo"></div>
            <div class="preview-controls">
              <button class="btn-preview-nav" id="prevFileBtn" title="File trước">
                <span class="mdi mdi-chevron-left"></span>
              </button>
              <button class="btn-preview-nav" id="nextFileBtn" title="File sau">
                <span class="mdi mdi-chevron-right"></span>
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    const modal = document.getElementById("previewModal");
    const closeBtn = document.getElementById("closePreview");
    const downloadBtn = document.getElementById("downloadFromPreview");
    const shareBtn = document.getElementById("shareFromPreview");
    const prevBtn = document.getElementById("prevFileBtn");
    const nextBtn = document.getElementById("nextFileBtn");

    // Close modal
    closeBtn?.addEventListener("click", () => this.closePreview());
    modal?.addEventListener("click", e => {
      if (e.target === modal) this.closePreview();
    });

    // Download from preview
    downloadBtn?.addEventListener("click", () => {
      if (this.currentFile) {
        if (typeof fileManager !== "undefined" && fileManager) {
          fileManager.downloadFile(this.currentFile.id, this.currentFile.name);
        } else {
          // Fallback
          window.open(`/api/download/${this.currentFile.id}`, "_blank");
        }
      }
    });

    // Share from preview
    shareBtn?.addEventListener("click", () => {
      if (this.currentFile?.shareLink) {
        navigator.clipboard.writeText(this.currentFile.shareLink).then(() => {
          showToast("Đã copy link chia sẻ!", "success");
        });
      }
    });

    // Navigation
    prevBtn?.addEventListener("click", () => this.navigateFile(-1));
    nextBtn?.addEventListener("click", () => this.navigateFile(1));

    // Keyboard shortcuts
    document.addEventListener("keydown", e => {
      if (modal?.style.display === "flex") {
        switch (e.key) {
          case "Escape":
            this.closePreview();
            break;
          case "ArrowLeft":
            this.navigateFile(-1);
            break;
          case "ArrowRight":
            this.navigateFile(1);
            break;
        }
      }
    });
  }

  async previewFile(file, fileList = []) {
    this.currentFile = file;
    this.fileList = fileList;
    this.currentIndex = fileList.findIndex(f => f.id === file.id);

    const modal = document.getElementById("previewModal");
    const title = document.getElementById("previewTitle");
    const body = document.getElementById("previewBody");
    const info = document.getElementById("previewInfo");

    // Show modal
    modal.style.display = "flex";
    title.textContent = file.name;

    // Show loading
    body.innerHTML = `
      <div class="preview-loading">
        <span class="mdi mdi-loading mdi-spin"></span>
        <span>Đang tải...</span>
      </div>
    `;

    // Update info
    info.innerHTML = `
      <span class="preview-size">${
        file.size ? formatSize(file.size) : ""
      }</span>
      <span class="preview-date">${
        file.modifiedTime
          ? new Date(file.modifiedTime).toLocaleDateString("vi-VN")
          : ""
      }</span>
    `;

    try {
      await this.loadPreviewContent(file, body);
    } catch (error) {
      console.error("Preview error:", error);
      body.innerHTML = `
        <div class="preview-error">
          <span class="mdi mdi-alert-circle"></span>
          <span>Không thể xem trước file này</span>
          <button class="btn btn-primary" onclick="if (typeof fileManager !== 'undefined' && fileManager) { fileManager.downloadFile('${file.id}', '${file.name}'); } else { window.open('/api/download/${file.id}', '_blank'); }">
            <span class="mdi mdi-download"></span> Tải về để xem
          </button>
        </div>
      `;
    }
  }

  async loadPreviewContent(file, container) {
    const fileType = this.getFileType(file.name);
    const fileId = file.id;

    switch (fileType) {
      case "image":
        await this.loadImagePreview(fileId, container);
        break;
      case "video":
        await this.loadVideoPreview(fileId, container);
        break;
      case "audio":
        await this.loadAudioPreview(fileId, container);
        break;
      case "pdf":
        await this.loadPdfPreview(fileId, container);
        break;
      case "text":
        await this.loadTextPreview(fileId, container);
        break;
      case "code":
        await this.loadCodePreview(fileId, container, file.name);
        break;
      default:
        this.loadUnsupportedPreview(container, fileType);
    }
  }

  async loadImagePreview(fileId, container) {
    container.innerHTML = `
      <div class="preview-image-container">
        <img src="/api/download/${fileId}" alt="Preview" class="preview-image" 
             onload="this.style.opacity=1" 
             onerror="this.parentElement.innerHTML='<div class=preview-error><span class=mdi mdi-image-broken></span>Không thể tải ảnh</div>'">
      </div>
    `;
  }

  async loadVideoPreview(fileId, container) {
    container.innerHTML = `
      <div class="preview-video-container">
        <video controls class="preview-video" preload="metadata">
          <source src="/api/download/${fileId}" type="video/mp4">
          <source src="/api/download/${fileId}" type="video/webm">
          <source src="/api/download/${fileId}" type="video/ogg">
          Trình duyệt không hỗ trợ video này.
        </video>
      </div>
    `;
  }

  async loadAudioPreview(fileId, container) {
    container.innerHTML = `
      <div class="preview-audio-container">
        <div class="audio-icon">
          <span class="mdi mdi-music-note"></span>
        </div>
        <audio controls class="preview-audio">
          <source src="/api/download/${fileId}" type="audio/mpeg">
          <source src="/api/download/${fileId}" type="audio/wav">
          <source src="/api/download/${fileId}" type="audio/ogg">
          Trình duyệt không hỗ trợ audio này.
        </audio>
      </div>
    `;
  }

  async loadPdfPreview(fileId, container) {
    container.innerHTML = `
      <div class="preview-pdf-container">
        <iframe src="/api/download/${fileId}" class="preview-pdf" type="application/pdf">
          <div class="preview-error">
            <span class="mdi mdi-file-pdf-box"></span>
            <span>Không thể xem PDF trong trình duyệt</span>
            <button class="btn btn-primary" onclick="if (typeof fileManager !== 'undefined' && fileManager) { fileManager.downloadFile('${fileId}', '${this.currentFile.name}'); } else { window.open('/api/download/${fileId}', '_blank'); }">
              <span class="mdi mdi-open-in-new"></span> Mở trong tab mới
            </button>
          </div>
        </iframe>
      </div>
    `;
  }

  async loadTextPreview(fileId, container) {
    try {
      const response = await fetch(`/api/download/${fileId}`);
      const text = await response.text();

      container.innerHTML = `
        <div class="preview-text-container">
          <pre class="preview-text">${this.escapeHtml(
            text.substring(0, 5000)
          )}${
        text.length > 5000
          ? "\n\n... (file quá lớn, download để xem đầy đủ)"
          : ""
      }</pre>
        </div>
      `;
    } catch (error) {
      throw new Error("Cannot load text file");
    }
  }

  async loadCodePreview(fileId, container, fileName) {
    try {
      const response = await fetch(`/api/download/${fileId}`);
      const code = await response.text();
      const language = this.getCodeLanguage(fileName);

      container.innerHTML = `
        <div class="preview-code-container">
          <div class="code-header">
            <span class="code-language">${language}</span>
            <span class="code-lines">${code.split("\n").length} dòng</span>
          </div>
          <pre class="preview-code language-${language}"><code>${this.escapeHtml(
        code.substring(0, 10000)
      )}${
        code.length > 10000
          ? "\n\n... (file quá lớn, download để xem đầy đủ)"
          : ""
      }</code></pre>
        </div>
      `;
    } catch (error) {
      throw new Error("Cannot load code file");
    }
  }

  loadUnsupportedPreview(container, fileType) {
    const typeInfo = {
      archive: { icon: "mdi-folder-zip", text: "File nén" },
      document: { icon: "mdi-file-document", text: "Tài liệu" },
      executable: { icon: "mdi-cog", text: "File thực thi" },
      default: { icon: "mdi-file", text: "File" },
    };

    const info = typeInfo[fileType] || typeInfo.default;

    container.innerHTML = `
      <div class="preview-unsupported">
        <span class="mdi ${info.icon} preview-file-icon"></span>
        <h3>${info.text}</h3>
        <p>Không thể xem trước loại file này</p>
        <button class="btn btn-primary" onclick="if (typeof fileManager !== 'undefined' && fileManager) { fileManager.downloadFile('${this.currentFile.id}', '${this.currentFile.name}'); } else { window.open('/api/download/${this.currentFile.id}', '_blank'); }">
          <span class="mdi mdi-download"></span> Tải về để mở
        </button>
      </div>
    `;
  }

  getFileType(fileName) {
    const ext = fileName.split(".").pop().toLowerCase();

    const types = {
      image: ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"],
      video: ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"],
      audio: ["mp3", "wav", "flac", "aac", "ogg", "m4a"],
      pdf: ["pdf"],
      text: ["txt", "md", "log", "csv"],
      code: [
        "js",
        "html",
        "css",
        "php",
        "py",
        "java",
        "cpp",
        "cs",
        "xml",
        "json",
      ],
      archive: ["zip", "rar", "7z", "tar", "gz"],
      document: ["doc", "docx", "xls", "xlsx", "ppt", "pptx"],
      executable: ["exe", "msi", "dmg", "deb", "rpm", "apk"],
    };

    for (const [type, extensions] of Object.entries(types)) {
      if (extensions.includes(ext)) return type;
    }

    return "default";
  }

  getCodeLanguage(fileName) {
    const ext = fileName.split(".").pop().toLowerCase();
    const languages = {
      js: "javascript",
      html: "html",
      css: "css",
      php: "php",
      py: "python",
      java: "java",
      cpp: "cpp",
      cs: "csharp",
      xml: "xml",
      json: "json",
      md: "markdown",
    };
    return languages[ext] || "text";
  }

  navigateFile(direction) {
    if (!this.fileList || this.fileList.length <= 1) return;

    const newIndex = this.currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.fileList.length) {
      const newFile = this.fileList[newIndex];
      if (!newFile.isFolder) {
        this.previewFile(newFile, this.fileList);
      }
    }
  }

  closePreview() {
    const modal = document.getElementById("previewModal");
    modal.style.display = "none";
    this.currentFile = null;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export instance
const previewManager = new PreviewManager();
