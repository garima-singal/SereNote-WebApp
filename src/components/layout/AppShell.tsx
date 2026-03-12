import { useState, useEffect } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/hooks/useTheme'

export const AppShell = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()
    const { user } = useAuthStore()
    useTheme() // applies data-theme to <html> based on user's saved preference

    // Close mobile drawer on route change
    useEffect(() => {
        setSidebarOpen(false)
    }, [location.pathname])

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [sidebarOpen])

    return (
        <div className="flex h-screen overflow-hidden bg-bg">

            {/* ── TOAST NOTIFICATIONS ─────────────────────────────── */}
            <Toaster
                position="top-right"
                richColors
                toastOptions={{
                    style: {
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '13px',
                    }
                }}
            />

            {/* ── DESKTOP SIDEBAR ─────────────────────────────────── */}
            <div className="hidden lg:flex shrink-0">
                <Sidebar />
            </div>

            {/* ── MOBILE DRAWER ───────────────────────────────────── */}
            {/* Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-ink/30 lg:hidden
                     animate-in fade-in duration-150"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Drawer panel — slides in from left */}
            <div
                className={`fixed inset-y-0 left-0 z-50 lg:hidden
                    transition-transform duration-200 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* ── MAIN CONTENT ────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Mobile top bar */}
                <div className="lg:hidden flex items-center gap-3 px-4 py-3
                        border-b border-border bg-card shrink-0 z-10">

                    {/* Hamburger */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="flex flex-col gap-[5px] p-1.5 rounded-lg
                       hover:bg-surface transition-colors"
                        aria-label="Open menu"
                    >
                        <span className="block w-5 h-[1.5px] bg-ink rounded-full" />
                        <span className="block w-5 h-[1.5px] bg-ink rounded-full" />
                        <span className="block w-4 h-[1.5px] bg-ink rounded-full" />
                    </button>

                    {/* Logo */}
                    <span className="font-lora text-base font-semibold text-ink flex-1">
                        Sere<span className="text-accent">Note</span>
                    </span>

                    {/* Search icon */}
                    <Link
                        to="/search"
                        className="w-8 h-8 flex items-center justify-center
                                   rounded-lg hover:bg-surface transition-colors
                                   text-muted hover:text-ink"
                        aria-label="Search"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                    </Link>

                    {/* User avatar */}
                    <Link
                        to="/profile"
                        className="w-8 h-8 rounded-full overflow-hidden shrink-0
                                   ring-2 ring-border hover:ring-accent
                                   transition-all"
                        aria-label="Profile"
                    >
                        {user?.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={user.displayName ?? 'Profile'}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-accent-pale flex
                                            items-center justify-center">
                                <span className="text-accent text-xs font-semibold font-lora">
                                    {(user?.displayName ?? user?.email ?? 'U')[0].toUpperCase()}
                                </span>
                            </div>
                        )}
                    </Link>
                </div>

                {/* Page content — scrollable */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>

            </div>
        </div>
    )
}