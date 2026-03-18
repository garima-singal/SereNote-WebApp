const CACHE_NAME = 'serenote-v1'

// Assets to cache on install for offline use
const PRECACHE_URLS = ['/']

// ── INSTALL ───────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll(PRECACHE_URLS).catch(() => { })
        )
    )
    self.skipWaiting()
})

// ── ACTIVATE — clean old caches ───────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => clients.claim())
    )
})

// ── FETCH — network first, cache fallback ─────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)

    // Skip API, Firebase, and cross-origin requests
    if (
        url.pathname.startsWith('/api/') ||
        url.hostname !== self.location.hostname
    ) return

    // Navigation — serve app shell from cache when offline
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    caches.open(CACHE_NAME).then(c => c.put(request, response.clone()))
                    return response
                })
                .catch(async () => {
                    const cached = await caches.match('/')
                    return cached || new Response('You are offline', { status: 503 })
                })
        )
        return
    }

    // Static assets — cache first
    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)) {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached
                return fetch(request).then(res => {
                    caches.open(CACHE_NAME).then(c => c.put(request, res.clone()))
                    return res
                })
            })
        )
    }
})

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener('push', (event) => {
    if (!event.data) return
    const data = event.data.json()
    const options = {
        body: data.body || 'Time to write in your journal ✦',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'serenote-reminder',
        renotify: false,
        actions: [
            { action: 'write', title: '✦ Write now' },
            { action: 'dismiss', title: 'Later' },
        ],
        data: { url: data.url || '/write' }
    }
    event.waitUntil(
        self.registration.showNotification(data.title || 'SereNote ✦', options)
    )
})

// ── NOTIFICATION CLICK ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    if (event.action === 'dismiss') return

    const targetUrl = event.action === 'write' ? '/write' : '/'
    const fullUrl = self.location.origin + targetUrl

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                for (const client of clientList) {
                    if ('focus' in client) {
                        return client.focus().then(() => {
                            if ('navigate' in client) return client.navigate(fullUrl)
                            client.postMessage({ type: 'NAVIGATE', url: targetUrl })
                        })
                    }
                }
                return clients.openWindow(fullUrl)
            })
    )
})