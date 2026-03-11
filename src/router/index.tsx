import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthPage } from '@/pages/AuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { WritePage } from '@/pages/WritePage'
import { BookmarksPage } from '@/pages/BookmarksPage'
import { TimelinePage } from '@/pages/TimelinePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { InsightsPage } from '@/pages/InsightsPage'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'

// ── LOADING SPINNER ───────────────────────────────────────────────────────────
// Shown while Firebase is checking auth state on first load (~200-500ms)
// Without this, there's a blank white flash before auth resolves
const AuthLoading = () => (
    <div className="flex items-center justify-center h-screen bg-bg">
        <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span className="text-xs text-muted">Loading...</span>
        </div>
    </div>
)

// ── PROTECTED ROUTE ───────────────────────────────────────────────────────────
// Wraps any page that requires authentication.
// - Firebase initializing → spinner (prevents blank screen or auth flash)
// - No user → redirect to /auth (replace so they can't press Back)
// - Logged in → render children
export const ProtectedRoute = ({
    children
}: {
    children: React.ReactNode
}) => {
    const { user, loading } = useAuthStore()

    if (loading) return <AuthLoading />
    if (!user) return <Navigate to="/auth" replace />

    return <>{children}</>
}

// ── PUBLIC ONLY ROUTE ─────────────────────────────────────────────────────────
// Wraps /auth — if already logged in, redirect home instead of showing login
const PublicOnlyRoute = ({
    children
}: {
    children: React.ReactNode
}) => {
    const { user, loading } = useAuthStore()

    if (loading) return <AuthLoading />
    if (user) return <Navigate to="/" replace />

    return <>{children}</>
}

// ── ROUTER ────────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
    {
        // /auth — only accessible when NOT logged in
        path: '/auth',
        element: (
            <PublicOnlyRoute>
                <AuthPage />
            </PublicOnlyRoute>
        ),
    },
    {
        // / — ALL children require authentication via ProtectedRoute
        path: '/',
        element: (
            <ProtectedRoute>
                <AppShell />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <DashboardPage /> },
            { path: 'write', element: <WritePage /> },
            { path: 'write/:entryId', element: <WritePage /> },
            { path: 'bookmarks', element: <BookmarksPage /> },
            { path: 'timeline', element: <TimelinePage /> },
            { path: 'settings', element: <SettingsPage /> },
            { path: 'profile', element: <ProfilePage /> },
            { path: 'insights', element: <InsightsPage /> },
            {
                path: 'search',
                element: (
                    <div className="p-8 text-ink font-lora text-xl">
                        Search — coming soon
                    </div>
                ),
            },
        ],
    },
    {
        // Catch-all — unknown URLs redirect to / which handles auth from there
        path: '*',
        element: <Navigate to="/" replace />,
    },
])