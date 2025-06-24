// Service Worker for Mini Google Drive v2.4.2
const CACHE_NAME = "mini-drive-v2.4.2";
const OFFLINE_URL = "/offline.html";

// Files to cache for offline access (only same-origin to avoid CSP issues)
const APP_SHELL_FILES = [
  "/",
  "/index.html",
  "/recycle-bin.html",
  "/css/main.css",
  "/js/app.js",
  "/js/fileManager.js",
  "/js/uploadManager.js",
  "/js/searchManager.js",
  "/js/themeManager.js",
  "/js/uiUtils.js",
  "/js/dialogManager.js",
  "/js/viewManager.js",
  "/js/contextMenuManager.js",
  "/js/keyboardManager.js",
  "/js/skeletonManager.js",
  "/js/sortManager.js",
  "/js/paginationManager.js",
  "/js/mobileActionManager.js",
  "/js/folderTreeManager.js",
  "/js/fileOperationsManager.js",
  "/js/previewManager.js",
  "/js/multiSelectManager.js",
  "/js/recycleBinManager.js",
  "/js/lazyLoadManager.js",
  "/manifest.json",
];

// Install Service Worker
self.addEventListener("install", event => {
  console.log("🔧 Service Worker installing...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        console.log("📦 Caching app shell files");
        return cache.addAll(APP_SHELL_FILES);
      })
      .then(() => {
        console.log("✅ App shell cached successfully");
        // Force activate new service worker immediately
        return self.skipWaiting();
      })
      .catch(error => {
        console.error("❌ Failed to cache app shell:", error);
      })
  );
});

// Activate Service Worker
self.addEventListener("activate", event => {
  console.log("🚀 Service Worker activating...");

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log("🗑️ Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("✅ Service Worker activated");
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch Strategy: Cache First for app shell, Network First for API
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests entirely to avoid CSP issues
  if (url.origin !== location.origin) {
    // Let the browser handle external resources naturally
    return;
  }

  // Handle API requests with Network First strategy
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Handle app shell with Cache First strategy
  event.respondWith(handleAppShellRequest(event.request));
});

// Network First strategy for API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful GET requests
    if (request.method === "GET" && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("🌐 Network failed, trying cache for:", url.pathname);

    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for specific endpoints
    if (url.pathname === "/api/files" || url.pathname === "/api/storage") {
      return new Response(
        JSON.stringify({
          offline: true,
          message: "Dữ liệu không khả dụng offline",
          files: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // For other API requests, return error
    return new Response(
      JSON.stringify({
        error: "Network unavailable",
        message: "Kết nối mạng không khả dụng",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Cache First strategy for app shell
async function handleAppShellRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try network if not in cache
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("📱 Serving offline fallback for:", request.url);

    // Return offline page for navigation requests
    if (request.mode === "navigate") {
      const offlineResponse = await caches.match(OFFLINE_URL);
      if (offlineResponse) {
        return offlineResponse;
      }

      // Fallback offline HTML
      return new Response(
        `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Offline - Mini Google Drive</title>
          <style>
            body { font-family: -apple-system, system-ui; text-align: center; padding: 50px; }
            .offline-icon { font-size: 64px; margin-bottom: 20px; }
            .offline-message { color: #666; margin-bottom: 30px; }
            .retry-btn { background: #4a9eff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="offline-icon">📱</div>
          <h1>Bạn đang offline</h1>
          <p class="offline-message">Mini Google Drive cần kết nối internet để hoạt động.</p>
          <button class="retry-btn" onclick="window.location.reload()">Thử lại</button>
        </body>
        </html>
      `,
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    // Return empty response for other requests
    return new Response("", { status: 408 });
  }
}

// Note: External resources are handled naturally by browser to avoid CSP issues

// Background Sync for upload queue (when browser supports it)
self.addEventListener("sync", event => {
  console.log("🔄 Background sync triggered:", event.tag);

  if (event.tag === "upload-queue") {
    event.waitUntil(processUploadQueue());
  }
});

// Process queued uploads when back online
async function processUploadQueue() {
  try {
    const queueData = await getStoredUploadQueue();

    if (queueData && queueData.length > 0) {
      console.log(`📤 Processing ${queueData.length} queued uploads`);

      // Send message to client to handle uploads
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: "PROCESS_UPLOAD_QUEUE",
          data: queueData,
        });
      });
    }
  } catch (error) {
    console.error("❌ Error processing upload queue:", error);
  }
}

// Get stored upload queue from IndexedDB
async function getStoredUploadQueue() {
  // Implementation would use IndexedDB to store/retrieve upload queue
  // For now, return empty array
  return [];
}

// Handle messages from clients
self.addEventListener("message", event => {
  const { type, data } = event.data;

  switch (type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    case "GET_VERSION":
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;

    case "QUEUE_UPLOAD":
      // Store upload data for background sync
      queueUploadForBackgroundSync(data);
      break;

    default:
      console.log("🔔 Unknown message type:", type);
  }
});

// Queue upload for background sync
function queueUploadForBackgroundSync(uploadData) {
  // Would store in IndexedDB for background sync
  console.log("📝 Queuing upload for background sync:", uploadData);
}

console.log("🚀 Mini Google Drive Service Worker v2.3.0 loaded");
