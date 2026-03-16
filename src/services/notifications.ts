export const isNotificationSupported = (): boolean => {
    return (
        'Notification' in window &&
        'serviceWorker' in navigator
    )
}

export const getPermissionStatus = (): NotificationPermission | 'unsupported' => {
    if (!isNotificationSupported()) return 'unsupported'
    return Notification.permission
}

export const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isNotificationSupported()) return 'denied'
    const result = await Notification.requestPermission()
    return result
}

// ── SERVICE WORKER ────────────────────────────────────────────

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null
    try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        return reg
    } catch (e) {
        console.error('SW registration failed:', e)
        return null
    }
}

// ── LOCAL SCHEDULER ───────────────────────────────────────────
// Since we don't have a push server, we use a clever trick:
// Schedule a setTimeout for the next reminder time,
// and store the alarm in localStorage so it survives refreshes.

const STORAGE_KEY = 'serenote_reminder'

interface ReminderConfig {
    enabled: boolean
    time: string   // "HH:MM" format e.g. "21:00"
    lastShown?: string   // ISO date string of last notification
}

export const saveReminderConfig = (config: ReminderConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export const getReminderConfig = (): ReminderConfig | null => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
}

// Calculate ms until next occurrence of HH:MM
const msUntilTime = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    const now = new Date()
    const next = new Date()
    next.setHours(hours, minutes, 0, 0)

    // If time has passed today, schedule for tomorrow
    if (next <= now) {
        next.setDate(next.getDate() + 1)
    }

    return next.getTime() - now.getTime()
}

let reminderTimer: ReturnType<typeof setTimeout> | null = null

export const scheduleReminder = (time: string) => {
    // Clear any existing timer
    if (reminderTimer) {
        clearTimeout(reminderTimer)
        reminderTimer = null
    }

    const ms = msUntilTime(time)

    reminderTimer = setTimeout(async () => {
        await showReminderNotification()
        // Reschedule for next day
        scheduleReminder(time)
    }, ms)

    console.log(`SereNote: reminder scheduled in ${Math.round(ms / 60000)} minutes`)
}

export const cancelReminder = () => {
    if (reminderTimer) {
        clearTimeout(reminderTimer)
        reminderTimer = null
    }
}

const showReminderNotification = async () => {
    if (Notification.permission !== 'granted') return

    const config = getReminderConfig()

    // Don't show if already shown today
    if (config?.lastShown) {
        const lastDate = new Date(config.lastShown).toDateString()
        if (lastDate === new Date().toDateString()) return
    }

    const messages = [
        "How are you feeling today? Take a moment to write it down.",
        "Your journal is waiting. Even a few words count.",
        "Reflection time — what's been on your mind?",
        "A quiet moment for yourself. Write something today.",
        "Check in with yourself. Your future self will thank you.",
    ]
    const body = messages[new Date().getDay() % messages.length]

    // Use service worker to show notification (works in background)
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification('SereNote ✦', {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'serenote-reminder',
        data: { url: '/write' },
        // @ts-ignore — actions supported in Chrome
        actions: [
            { action: 'write', title: '✦ Write now' },
            { action: 'dismiss', title: 'Later' },
        ],
    })

    // Save last shown date
    if (config) {
        saveReminderConfig({ ...config, lastShown: new Date().toISOString() })
    }
}

// ── INIT ──────────────────────────────────────────────────────
// Call this on app start to restore scheduled reminders

export const listenForNavigationMessages = (navigate: (path: string) => void): void => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type === 'NAVIGATE' && event.data?.url) {
            navigate(event.data.url as string)
        }
    })
}

export const initNotifications = async () => {
    if (!isNotificationSupported()) return
    if (Notification.permission !== 'granted') return

    await registerServiceWorker()

    const config = getReminderConfig()
    if (config?.enabled && config.time) {
        scheduleReminder(config.time)
    }
}