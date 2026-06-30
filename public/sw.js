const CACHE_NAME = "copa-2026-cache-v2"
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/images/fifa-2026-logo.jpg",
  "/images/trophy.png",
  "/images/bbm-space-logo.png",
  "/audio/fifa-2026-theme.mp3",
]

// Install Event - Pre-cache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE)
    }).then(() => self.skipWaiting())
  )
})

// Activate Event - Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch Event - Cache-first or Network-first strategy
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const url = new URL(event.request.url)

  // For external images (like icons8 flag URLs), cache them dynamically
  if (url.origin === "https://img.icons8.com") {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse
          }
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
          return networkResponse
        }).catch(() => {
          // Return fallback app logo if offline and not cached
          return caches.match("/images/fifa-2026-logo.jpg")
        })
      })
    )
    return
  }

  // Local assets cache-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache newly fetched assets dynamically (e.g. Next.js chunks)
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/static/"))
        ) {
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return networkResponse
      }).catch(() => {
        return caches.match("/")
      })
    })
  )
})
