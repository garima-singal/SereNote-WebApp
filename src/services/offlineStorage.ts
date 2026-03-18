const DB_NAME = 'serenote-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-entries'

export interface PendingEntry {
    id: string        // local temp ID or real Firestore ID
    uid: string
    title: string
    body: string
    bodyText: string
    moods: string[]
    tags: string[]
    wordCount: number
    isNew: boolean       // true = needs createEntry, false = needs updateEntry
    savedAt: number        // timestamp
}

// ── DB INIT ───────────────────────────────────────────────────

let _db: IDBDatabase | null = null

const getDB = (): Promise<IDBDatabase> => {
    if (_db) return Promise.resolve(_db)

    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)

        req.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
                store.createIndex('uid', 'uid', { unique: false })
                store.createIndex('savedAt', 'savedAt', { unique: false })
            }
        }

        req.onsuccess = (event) => {
            _db = (event.target as IDBOpenDBRequest).result
            resolve(_db)
        }

        req.onerror = () => reject(req.error)
    })
}

// ── CRUD ──────────────────────────────────────────────────────

export const savePendingEntry = async (entry: PendingEntry): Promise<void> => {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(entry)
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

export const getPendingEntries = async (uid: string): Promise<PendingEntry[]> => {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('uid')
    const req = index.getAll(uid)

    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result ?? [])
        req.onerror = () => reject(req.error)
    })
}

export const deletePendingEntry = async (id: string): Promise<void> => {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(id)
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

export const getPendingCount = async (uid: string): Promise<number> => {
    const entries = await getPendingEntries(uid)
    return entries.length
}

// ── ONLINE/OFFLINE DETECTION ──────────────────────────────────

export const isOnline = (): boolean => navigator.onLine

export const onOnline = (cb: () => void) => window.addEventListener('online', cb)
export const onOffline = (cb: () => void) => window.addEventListener('offline', cb)
export const offOnline = (cb: () => void) => window.removeEventListener('online', cb)
export const offOffline = (cb: () => void) => window.removeEventListener('offline', cb)