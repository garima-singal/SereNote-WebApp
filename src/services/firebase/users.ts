import { db } from './config'
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import type { UserProfile, UserSettings } from '@/types/user'

// ── CREATE USER DOC ───────────────────────────────────────────────────────────
// Called after every login — only creates if doesn't exist yet
export const createUserDocument = async (user: User): Promise<void> => {
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)
    if (userSnap.exists()) return

    await setDoc(userRef, {
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        photoURL: user.photoURL ?? '',
        bio: '',
        createdAt: serverTimestamp(),
        streak: 0,
        bestStreak: 0,
        totalEntries: 0,
        onboardingComplete: false,
        settings: {
            theme: 'light',
            fontSize: 'md',
            fontFamily: 'lora',
            notificationsEnabled: false,
            reminderTime: '21:00',
            aiOptIn: false,
        },
    })
}

// ── COMPLETE ONBOARDING ───────────────────────────────────────────────────────
export const completeOnboarding = async (
    uid: string,
    data: {
        displayName: string
        theme: string
        aiOptIn: boolean
        reminderTime: string
        notificationsEnabled: boolean
    }
): Promise<void> => {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, {
        displayName: data.displayName,
        onboardingComplete: true,
        'settings.theme': data.theme,
        'settings.aiOptIn': data.aiOptIn,
        'settings.reminderTime': data.reminderTime,
        'settings.notificationsEnabled': data.notificationsEnabled,
    })
}

// ── GET USER PROFILE ──────────────────────────────────────────────────────────
export const getUserProfile = async (
    uid: string
): Promise<UserProfile | null> => {
    const userRef = doc(db, 'users', uid)
    const userSnap = await getDoc(userRef)
    if (!userSnap.exists()) return null
    return { uid, ...userSnap.data() } as UserProfile
}

// ── UPDATE USER PROFILE ───────────────────────────────────────────────────────
// Updates top-level profile fields: displayName, bio, photoURL
export const updateUserProfile = async (
    uid: string,
    data: { displayName?: string; bio?: string; photoURL?: string }
): Promise<void> => {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, data)
}

// ── UPDATE SETTINGS ───────────────────────────────────────────────────────────
// Updates nested settings fields without overwriting the whole object
export const updateUserSettings = async (
    uid: string,
    settings: Partial<UserSettings>
): Promise<void> => {
    const userRef = doc(db, 'users', uid)
    const updates = Object.fromEntries(
        Object.entries(settings).map(([k, v]) => [`settings.${k}`, v])
    )
    await updateDoc(userRef, updates)
}

// ── UPDATE STREAK ─────────────────────────────────────────────────────────────
export const updateStreak = async (
    uid: string,
    streak: number,
    bestStreak: number
): Promise<void> => {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, { streak, bestStreak })
}