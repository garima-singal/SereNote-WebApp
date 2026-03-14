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
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/icon-192.png',
        tag: data.tag || 'serenote-reminder',
        renotify: false,
        actions: [
            { action: 'write', title: '✦ Write now' },
            { action: 'dismiss', title: 'Later' },
        ],
        data: {
            url: data.url || '/',
        }
    }

    event.waitUntil(
        self.registration.showNotification(
            data.title || 'SereNote — Daily Reminder',
            options
        )
    )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    const url = event.action === 'write'
        ? '/write'
        : (event.notification.data?.url || '/')

    if (event.action === 'dismiss') return

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.focus()
                        client.navigate(url)
                        return
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow(url)
                }
            })
    )
})