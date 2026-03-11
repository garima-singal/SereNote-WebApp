import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import {
    isBookmarked,
    addBookmark,
    removeBookmark,
} from '@/services/firebase/bookmarks'

export const useBookmark = (entryId: string | undefined) => {
    const { user } = useAuthStore()
    const [bookmarkId, setBookmarkId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Check if this entry is already bookmarked
    useEffect(() => {
        if (!user || !entryId) return
        isBookmarked(user.uid, entryId).then(setBookmarkId)
    }, [user, entryId])

    const toggle = async () => {
        if (!user || !entryId || loading) return
        setLoading(true)
        try {
            if (bookmarkId) {
                await removeBookmark(user.uid, bookmarkId)
                setBookmarkId(null)
            } else {
                const id = await addBookmark(user.uid, entryId)
                setBookmarkId(id)
            }
        } finally {
            setLoading(false)
        }
    }

    return {
        isBookmarked: !!bookmarkId,
        toggle,
        loading,
    }
}