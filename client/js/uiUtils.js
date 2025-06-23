// UI Utilities Module

// My personal quota in GB (0 = unlimited)
const MY_QUOTA_GB = 0;

// Toast notification with duplicate prevention
let activeToasts = new Set();

function showToast(msg, type = "info") {
  // Prevent duplicate toasts
  const toastKey = `${type}:${msg}`;
  if (activeToasts.has(toastKey)) {
    return; // Skip if same toast is already active
  }

  activeToasts.add(toastKey);

  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="mdi ${
    type === "success"
      ? "mdi-check-circle-outline"
      : type === "error"
      ? "mdi-alert-circle-outline"
      : type === "warning"
      ? "mdi-alert-outline"
      : "mdi-information-outline"
  }"></span> ${msg}`;
  toastContainer.appendChild(toast);

  // Increased display time from 2.3s to 4s
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => {
      toast.remove();
      activeToasts.delete(toastKey); // Remove from active set
    }, 600);
  }, 4000);
}

// Note: showConfirm is deprecated - use dialogManager.showConfirm instead

// Format file size
function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
}

// Convert bytes to GB
function toGB(bytes) {
  return (bytes / 1024 / 1024 / 1024).toLocaleString("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Get file type icon
function getFileTypeIcon(file) {
  if (file.isFolder)
    return '<span class="mdi mdi-folder file-icon" style="color:#ffb300"></span>';

  const ext = (file.name || "").split(".").pop().toLowerCase();
  const iconMap = {
    xml: '<span class="mdi mdi-xml file-icon" style="color:#7d63e0"></span>',
    py: '<span class="mdi mdi-language-python file-icon" style="color:#306998"></span>',
    php: '<span class="mdi mdi-language-php file-icon" style="color:#6e4fbb"></span>',
    json: '<span class="mdi mdi-code-json file-icon" style="color:#01a98e"></span>',
    exe: '<span class="mdi mdi-cog file-icon" style="color:#455a64"></span>',
    apk: '<span class="mdi mdi-android file-icon" style="color:#43b755"></span>',
    cs: '<span class="mdi mdi-language-csharp file-icon" style="color:#512bd4"></span>',
    js: '<span class="mdi mdi-language-javascript file-icon" style="color:#efd81d"></span>',
    html: '<span class="mdi mdi-language-html5 file-icon" style="color:#e34c26"></span>',
    css: '<span class="mdi mdi-language-css3 file-icon" style="color:#2965f1"></span>',
    zip: '<span class="mdi mdi-folder-zip file-icon" style="color:#607d8b"></span>',
    rar: '<span class="mdi mdi-folder-zip file-icon" style="color:#607d8b"></span>',
    txt: '<span class="mdi mdi-file-document-outline file-icon" style="color:#222"></span>',
    pdf: '<span class="mdi mdi-file-pdf-box file-icon" style="color:#ea4335"></span>',
    doc: '<span class="mdi mdi-file-word-box file-icon" style="color:#4285f4"></span>',
    docx: '<span class="mdi mdi-file-word-box file-icon" style="color:#4285f4"></span>',
    xls: '<span class="mdi mdi-file-excel-box file-icon" style="color:#34a853"></span>',
    xlsx: '<span class="mdi mdi-file-excel-box file-icon" style="color:#34a853"></span>',
    png: '<span class="mdi mdi-file-image file-icon" style="color:#fbc02d"></span>',
    jpg: '<span class="mdi mdi-file-image file-icon" style="color:#fbc02d"></span>',
    jpeg: '<span class="mdi mdi-file-image file-icon" style="color:#fbc02d"></span>',
    gif: '<span class="mdi mdi-file-image file-icon" style="color:#fbc02d"></span>',
    bmp: '<span class="mdi mdi-file-image file-icon" style="color:#fbc02d"></span>',
    mp3: '<span class="mdi mdi-file-music file-icon" style="color:#9c27b0"></span>',
    wav: '<span class="mdi mdi-file-music file-icon" style="color:#9c27b0"></span>',
    mp4: '<span class="mdi mdi-file-video file-icon" style="color:#00acc1"></span>',
    mov: '<span class="mdi mdi-file-video file-icon" style="color:#00acc1"></span>',
  };

  return (
    iconMap[ext] ||
    '<span class="mdi mdi-file-outline file-icon" style="color:#636c72"></span>'
  );
}

// Fetch storage info
async function fetchStorage() {
  try {
    const res = await fetch("/api/storage");
    const quota = await res.json();
    const usedBytes = quota.usageInDrive ? Number(quota.usageInDrive) : 0;
    let totalQuotaBytes = quota.limit ? Number(quota.limit) : 0;

    let quotaGB =
      typeof MY_QUOTA_GB !== "undefined" && MY_QUOTA_GB > 0
        ? MY_QUOTA_GB
        : totalQuotaBytes > 0
        ? totalQuotaBytes / 1024 / 1024 / 1024
        : 0;

    let quotaText =
      quotaGB > 0
        ? quotaGB.toLocaleString("vi-VN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "Không giới hạn";

    let percent =
      quotaGB > 0
        ? ((usedBytes / (quotaGB * 1024 * 1024 * 1024)) * 100).toFixed(2)
        : "";

    const usedGB = toGB(usedBytes);
    let percentStr = percent ? `(${percent}%)` : "";

    const html = `
      <b>Bộ nhớ Drive:</b> Đã dùng ${usedGB} GB / ${quotaText} GB
      ${percentStr}
      <div class="storage-bar-wrap">
        <div class="storage-bar-bg">
          <div class="storage-bar-used" style="width:${percent || 1}%;"></div>
        </div>
      </div>
    `;
    document.getElementById("storageBar").innerHTML = html;
  } catch (e) {
    document.getElementById("storageBar").innerHTML =
      '<span style="color:red">Không lấy được thông tin dung lượng</span>';
  }
}

// Create folder modal
async function promptCreateFolder() {
  const folderName = await dialogManager.showPrompt({
    title: "Tạo thư mục mới",
    message: "Nhập tên thư mục:",
    placeholder: "Tên thư mục...",
    confirmText: "Tạo",
    cancelText: "Hủy",
  });

  if (folderName && folderName.trim()) {
    await fileManager.createFolder(folderName.trim());
  }
}

// Legacy functions removed - all functionality moved to dialogManager
