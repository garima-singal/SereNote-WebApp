import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { isOnline, onOnline, onOffline, offOnline, offOffline, getPendingCount } from '@/services/offlineStorage'
import { syncPendingEntries } from '@/services/syncService'
import { toast } from 'sonner'

export const OfflineBanner = () => {
    const { user } = useAuthStore()
    const [offline, setOffline] = useState(!isOnline())
    const [syncing, setSyncing] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)

    // Check pending count
    const refreshPending = async () => {
        if (!user) return
        const count = await getPendingCount(user.uid)
        setPendingCount(count)
    }

    useEffect(() => {
        refreshPending()
    }, [user])

    useEffect(() => {
        const handleOffline = () => {
            setOffline(true)
            refreshPending()
        }

        const handleOnline = async () => {
            setOffline(false)
            if (!user) return

            const count = await getPendingCount(user.uid)
            if (count === 0) return

            // Auto-sync when back online
            setSyncing(true)
            try {
                const result = await syncPendingEntries(user.uid)
                if (result.synced > 0) {
                    toast.success(`✦ ${result.synced} ${result.synced === 1 ? 'entry' : 'entries'} synced!`)
                }
                if (result.failed > 0) {
                    toast.error(`${result.failed} entries failed to sync. Will retry.`)
                }
                setPendingCount(0)
            } catch {
                toast.error('Sync failed. Will retry when possible.')
            } finally {
                setSyncing(false)
            }
        }

        onOnline(handleOnline)
        onOffline(handleOffline)

        return () => {
            offOnline(handleOnline)
            offOffline(handleOffline)
        }
    }, [user])

    // Expose refresh to WritePage via custom event
    useEffect(() => {
        const handlePendingUpdate = () => refreshPending()
        window.addEventListener('serenote:pending-update', handlePendingUpdate)
        return () => window.removeEventListener('serenote:pending-update', handlePendingUpdate)
    }, [user])

    if (!offline && pendingCount === 0 && !syncing) return null

    return (
        <div className={`w-full px-4 py-2 text-xs flex items-center justify-center
                     gap-2 transition-all ${syncing
                ? 'bg-lav-pale border-b border-lav/20 text-lav'
                : offline
                    ? 'bg-terra-pale border-b border-terra/20 text-terra'
                    : 'bg-gold/10 border-b border-gold/20 text-gold'
            }`}>
            {syncing ? (
                <>
                    <span className="w-2.5 h-2.5 border border-lav border-t-transparent
                           rounded-full animate-spin shrink-0" />
                    Syncing {pendingCount} pending {pendingCount === 1 ? 'entry' : 'entries'}…
                </>
            ) : offline ? (
                <>
                    <span className="w-1.5 h-1.5 rounded-full bg-terra shrink-0" />
                    You're offline — entries will sync when you reconnect
                    {pendingCount > 0 && (
                        <span className="ml-1 font-medium">
                            ({pendingCount} pending)
                        </span>
                    )}
                </>
            ) : (
                <>
                    <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                    {pendingCount} {pendingCount === 1 ? 'entry' : 'entries'} waiting to sync
                </>
            )}
        </div>
    )
}