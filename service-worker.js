// Service Worker for BK Parfume PWA
const CACHE_NAME = "bk-parfume-v1.0.18";
const STATIC_CACHE = "bk-parfume-static-v1.0.18";
const DYNAMIC_CACHE = "bk-parfume-dynamic-v1.0.18";

// Files to cache immediately
const STATIC_FILES = [
  "/",
  "/index.html",
  "/favicon.ico",
  "/favicon.png",
  "/articles.html",
  "/about.html",
  "/contacts.html",
  "/css/style.min.css",
  "/css/critical.min.css",
  "/js/app-v4.js",
  "/js/app-v4.min.js",
  "/manifest.json",
  "/images/products/favicon-16.png",
  "/images/products/favicon-32.png",
  "/images/products/favicon-96.png",
  "/images/products/favicon-192.png",
  "/images/products/favicon-512.png",
  "/images/products/apple-touch-icon.png",
  "/humans.txt",
  "/robots.txt",
  "/sitemap.xml",
];

// Install event - cache static files
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker");
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching static files");
        return cache.addAll(STATIC_FILES);
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Handle API requests differently
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            error: "Offline",
            message: "Ця функція недоступна в офлайн режимі",
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );
    return;
  }

  // Cache-first strategy for static assets
  if (
    STATIC_FILES.some((file) => url.pathname === file) ||
    url.pathname.match(/\.(css|js|png|jpg|jpeg|webp|svg|woff|woff2)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches
              .open(STATIC_CACHE)
              .then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Network-first strategy for HTML pages
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches
            .open(DYNAMIC_CACHE)
            .then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Return offline page for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      }),
  );
});

// Background sync for form submissions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync-forms") {
    event.waitUntil(syncForms());
  }
});

async function syncForms() {
  try {
    const cache = await caches.open("form-data");
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch (error) {
        console.log("[SW] Form sync failed:", error);
      }
    }
  } catch (error) {
    console.log("[SW] Background sync error:", error);
  }
}

// Push notifications (placeholder for future implementation)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/images/products/favicon-32.png",
      badge: "/images/products/favicon-32.png",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
