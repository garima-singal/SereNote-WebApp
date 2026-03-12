import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getUserProfile } from '@/services/firebase/users'

// Reads theme from Firestore settings and applies data-theme to <html>
// Called once in AppShell so it's active on every page
export const useTheme = () => {
    const { user } = useAuthStore()

    useEffect(() => {
        if (!user) return
        const load = async () => {
            const profile = await getUserProfile(user.uid)
            const theme = profile?.settings?.theme ?? 'light'
            applyTheme(theme)
        }
        load()
    }, [user])
}

export const applyTheme = (theme: 'light' | 'dark' | 'sepia') => {
    document.documentElement.setAttribute('data-theme', theme)
}