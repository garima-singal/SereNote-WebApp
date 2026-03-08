// These are React Router's core pieces
import { createBrowserRouter, Navigate } from 'react-router-dom'

// We import all our page components
// These don't exist yet — we'll create them one by one
import { AuthPage } from '@/pages/AuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AppShell } from '@/components/layout/AppShell'

// useAuthStore gives us access to the current user
import { useAuthStore } from '@/store/authStore'

// ── PROTECTED ROUTE ──────────────────────────────────────────
// This is a wrapper component that guards private pages
// If the user is NOT logged in, it redirects them to /auth
// If they ARE logged in, it renders whatever is inside it
export const ProtectedRoute = ({
    children
}: {
    children: React.ReactNode
}) => {
    // Read the user and loading state from our Zustand store
    const { user, loading } = useAuthStore()

    // While Firebase is still checking auth state, show nothing
    // This prevents a flash of the login page for logged-in users
    if (loading) return null

    // If no user is logged in, redirect to the auth page
    // 'replace' means the /auth page replaces the current history entry
    // so the user can't press Back to get to the protected page
    if (!user) return <Navigate to="/auth" replace />

    // User is logged in — render the protected content
    return <>{children}</>
}

// ── ROUTER ───────────────────────────────────────────────────
// createBrowserRouter sets up all our app's routes
// Each object is one route: { path, element }
export const router = createBrowserRouter([
    {
        // /auth is the login page — publicly accessible
        path: '/auth',
        element: <AuthPage />,
    },
    {
        // '/' is the root — everything inside needs login
        path: '/',
        // AppShell is our sidebar + layout wrapper
        // ProtectedRoute guards it — redirects to /auth if not logged in
        element: (
            <ProtectedRoute>
                <AppShell />
            </ProtectedRoute>
        ),
        // These are nested routes — they render INSIDE AppShell
        children: [
            {
                // The index route renders when path is exactly '/'
                index: true,
                element: <DashboardPage />,
            },
        ],
    },
])