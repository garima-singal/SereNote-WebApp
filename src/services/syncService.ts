import { createEntry, updateEntry } from './firebase/entries'
import { getPendingEntries, deletePendingEntry } from './offlineStorage'


export interface SyncResult {
    synced: number
    failed: number
}

export const syncPendingEntries = async (uid: string): Promise<SyncResult> => {
    const pending = await getPendingEntries(uid)
    if (pending.length === 0) return { synced: 0, failed: 0 }

    let synced = 0
    let failed = 0

    for (const entry of pending) {
        try {
            const data = {
                title: entry.title,
                body: entry.body,
                bodyText: entry.bodyText,
                moods: entry.moods as any,
                tags: entry.tags,
                wordCount: entry.wordCount,
                status: 'published' as const,
            }

            if (entry.isNew) {
                // Create new entry in Firestore
                const newId = await createEntry(uid)
                await updateEntry(uid, newId, data)
            } else {
                // Update existing entry
                await updateEntry(uid, entry.id, data)
            }

            // Remove from pending queue on success
            await deletePendingEntry(entry.id)
            synced++
        } catch (e) {
            console.error(`Failed to sync entry ${entry.id}:`, e)
            failed++
        }
    }

    return { synced, failed }
}