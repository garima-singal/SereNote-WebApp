// useEffect runs code when the component mounts/unmounts
import { useEffect } from 'react'

// We import our Zustand store to update global auth state
import { useAuthStore } from '@/store/authStore'

// We import our listener function from the auth service
import { onAuthChange } from '@/services/firebase/auth'

// This is a custom hook — a reusable function that wraps
// Firebase's auth listener and keeps Zustand in sync
export const useAuth = () => {
    // We pull setUser and setLoading from the store
    // These let us update global state from inside this hook
    const { setUser, setLoading } = useAuthStore()

    useEffect(() => {
        // onAuthChange fires immediately when called —
        // it checks if a user is already logged in (e.g. from yesterday)
        // Then it keeps listening and fires again on every login/logout
        const unsubscribe = onAuthChange((firebaseUser) => {
            // Update the global user state with whoever is logged in (or null)
            setUser(firebaseUser)

            // We're done checking — set loading to false
            // This tells the app it's safe to show the UI
            setLoading(false)
        })

        // This is the cleanup function — React calls this when the
        // component using this hook unmounts (e.g. navigating away)
        // It stops the Firebase listener to prevent memory leaks
        return () => unsubscribe()

        // Empty array [] means this effect runs ONCE when the app first loads
    }, [setUser, setLoading])
}