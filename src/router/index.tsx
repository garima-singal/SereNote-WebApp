import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthPage } from '@/pages/AuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { WritePage } from '@/pages/WritePage'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { SettingsPage } from '@/pages/SettingsPage'
import { TimelinePage } from '@/pages/TimelinePage'
import { ProfilePage } from '@/pages/ProfilePage'
import { BookmarksPage } from '@/pages/BookmarksPage'
import { InsightsPage } from '@/pages/InsightsPage'

// ── PROTECTED ROUTE ──────────────────────────────────────────
// Guards private pages — redirects to /auth if not logged in
export const ProtectedRoute = ({
    children
}: {
    children: React.ReactNode
}) => {
    const { user, loading } = useAuthStore()

    // While Firebase is still checking auth state, show nothing
    // This prevents a flash of the login page for logged-in users
    if (loading) return null

    // Not logged in — redirect to auth
    if (!user) return <Navigate to="/auth" replace />

    return <>{children}</>
}

// ── ROUTER ───────────────────────────────────────────────────
export const router = createBrowserRouter([
    {
        // Public route — login/signup page
        path: '/auth',
        element: <AuthPage />,
    },
    {
        // Protected root — AppShell wraps all inner pages
        path: '/',
        element: (
            <ProtectedRoute>
                <AppShell />
            </ProtectedRoute>
        ),
        children: [
            {
                // Dashboard — default page at '/'
                index: true,
                element: <DashboardPage />,
            },
            {
                // New entry — no ID yet, WritePage creates one on first save
                path: 'write',
                element: <WritePage />,
            },
            {
                // Edit existing entry by Firestore document ID
                path: 'write/:entryId',
                element: <WritePage />,
            },
            {
                // Bookmarks page — coming soon
                path: 'bookmarks',
                element: <BookmarksPage />
            },

            {
                path: 'timeline',
                element: <TimelinePage />
            },

            {
                // Settings — coming soon
                path: 'settings',
                element: <SettingsPage />
            },
            {
                // Profile — coming soon
                path: 'profile',
                element: <ProfilePage />
            },
            {
                // Insights — coming soon
                path: 'insights',
                element: <InsightsPage />
            },
            {
                // Search — coming soon
                path: 'search',
                element: (
                    <div className="p-8 text-ink font-lora text-xl">
                        Search — coming soon
                    </div>
                ),
            },
        ],
    },
])