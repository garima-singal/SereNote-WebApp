export interface UserSettings {
    theme: 'light' | 'dark' | 'sepia'
    fontSize: 'sm' | 'md' | 'lg'
    fontFamily: 'lora' | 'dm-sans'
    notificationsEnabled: boolean
    reminderTime: string
    aiOptIn: boolean
}

export interface UserProfile {
    uid: string
    displayName: string
    email: string
    photoURL: string
    bio: string
    createdAt?: any
    streak: number
    bestStreak: number
    totalEntries: number
    onboardingComplete: boolean
    settings: UserSettings
}