self.addEventListener('install', (event) => {
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim())
})

// Handle incoming push notifications
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
        self.registration.showNotification(
            data.title || 'SereNote ✦',
            options
        )
    )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    // Dismiss action — do nothing
    if (event.action === 'dismiss') return

    // Always go to /write for "Write now", else home
    const targetUrl = event.action === 'write' ? '/write' : '/'
    const fullUrl = self.location.origin + targetUrl

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if any SereNote tab is already open
                for (const client of clientList) {
                    if ('focus' in client) {
                        // Focus the existing tab and navigate it
                        return client.focus().then(() => {
                            if ('navigate' in client) {
                                return client.navigate(fullUrl)
                            }
                            // Fallback — post a message to the client to navigate
                            client.postMessage({ type: 'NAVIGATE', url: targetUrl })
                        })
                    }
                }
                // No existing tab — open a new one
                return clients.openWindow(fullUrl)
            })
    )
})