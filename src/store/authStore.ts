// Zustand is our state manager — 'create' makes a new store
import { create } from 'zustand'

// We import the User type from Firebase for TypeScript
import type { User } from 'firebase/auth'

// This defines the shape (TypeScript interface) of our auth store
// Think of it as a blueprint — what data does this store hold?
interface AuthStore {
    user: User | null      // The logged-in user, or null if logged out
    loading: boolean       // True while we're checking if user is logged in
    setUser: (user: User | null) => void  // Function to update the user
    setLoading: (loading: boolean) => void // Function to update loading state
}

// create() builds the store
// The function receives 'set' — which is how you update state in Zustand
export const useAuthStore = create<AuthStore>((set) => ({
    // Initial state — we start with no user and loading = true
    // loading starts as true because Firebase takes a moment to check
    // if a user is already logged in from a previous session
    user: null,
    loading: true,

    // setUser updates the 'user' field in the store
    // Any component using this store will automatically re-render
    setUser: (user) => set({ user }),

    // setLoading updates the 'loading' field
    setLoading: (loading) => set({ loading }),
}))