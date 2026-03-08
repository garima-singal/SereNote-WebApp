import { auth } from './config'

// These are Firebase's built-in functions for different auth actions
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
} from 'firebase/auth'

import type { User } from 'firebase/auth'

// GoogleAuthProvider is a class — we create one instance of it
// This tells Firebase "use Google as the sign-in method"
const googleProvider = new GoogleAuthProvider()

// ── GOOGLE SIGN IN ──────────────────────────────────────────
// signInWithPopup opens a Google login popup
// It returns a Promise — so we use async/await
export const signInWithGoogle = async () => {
    // 'await' pauses here until the user finishes signing in
    // If they cancel or it fails, it throws an error
    const result = await signInWithPopup(auth, googleProvider)

    // result.user contains the logged-in user's info
    // (name, email, photo URL, uid etc.)
    return result.user
}

// ── EMAIL SIGN IN ────────────────────────────────────────────
// Takes an email string and password string
// Returns the logged-in user or throws an error
export const signInWithEmail = async (
    email: string,
    password: string
) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
}

// ── EMAIL SIGN UP ────────────────────────────────────────────
// Creates a brand new account with email + password + display name
export const signUpWithEmail = async (
    email: string,
    password: string,
    displayName: string
) => {
    // First create the account — this gives us a user object
    const result = await createUserWithEmailAndPassword(auth, email, password)

    // Then immediately update the profile to save the display name
    // Without this, the user's name would be null after signup
    await updateProfile(result.user, { displayName })

    return result.user
}

// ── SIGN OUT ─────────────────────────────────────────────────
// Logs the current user out
// signOut(auth) clears the session from Firebase + browser
export const logOut = async () => {
    await signOut(auth)
}

// ── AUTH STATE LISTENER ──────────────────────────────────────
// This is the most important function — it listens 24/7
// Whenever the user logs in OR logs out, the callback fires
// 'callback' receives either a User object or null (if logged out)
// We use this in our useAuth hook to keep the app in sync
export const onAuthChange = (
    callback: (user: User | null) => void
) => {
    // onAuthStateChanged returns an 'unsubscribe' function
    // We return it so we can stop listening when a component unmounts
    return onAuthStateChanged(auth, callback)
}