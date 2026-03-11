import { useEffect } from 'react'
import { onAuthChange } from '@/services/firebase/auth'
import { createUserDocument } from '@/services/firebase/users'
import { useAuthStore } from '@/store/authStore'

// Listens to Firebase Auth state changes and syncs to Zustand store.
// Also ensures the Firestore user document exists on every session restore —
// this handles the case where Firestore data was deleted but Auth was not.
export const useAuth = () => {
    const { setUser, setLoading } = useAuthStore()

    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (user) {
                // Re-create user document if it was deleted from Firestore
                // createUserDocument is idempotent — skips if doc already exists
                await createUserDocument(user)
                setUser(user)
            } else {
                setUser(null)
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [setUser, setLoading])
}